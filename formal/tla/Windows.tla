------------------------------- MODULE Windows -------------------------------
(***************************************************************************)
(* Model of the per-window registry in src-tauri/src/lib.rs               *)
(* (`AppState.windows`) and the paths that write it:                       *)
(*                                                                         *)
(*   FrontOpen / OpenDone  `open_file` (drag-drop onto an empty window,    *)
(*                         plant shelf click, file picker). Async: it      *)
(*                         awaits the bundle between its two halves.       *)
(*   NewWindow / SpawnDone `open_in_new_windows`, extra picked files and   *)
(*                         extra Finder files -> `spawn_bundle_and_watch`. *)
(*   FinderOpen            `RunEvent::Opened` claiming "main".             *)
(*   Destroy               `WindowEvent::Destroyed`.                       *)
(*                                                                         *)
(* Fixed = FALSE models v1.0.1. Fixed = TRUE models the change in this     *)
(* branch: the registry is written before the await, a closed label is     *)
(* remembered, and async completions only apply if the registry still     *)
(* maps their window to their file.                                        *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS Files, NewLabels, Fixed

Main == "main"
Labels == {Main} \cup NewLabels
None == "none"
FileOrNone == Files \cup {None}

VARIABLES
    created,  \* windows that exist or are reserved ("main" from the start)
    closed,   \* windows that received WindowEvent::Destroyed
    reg,      \* state.windows[label].file
    watch,    \* which file state.windows[label].watcher is watching
    shown,    \* which file's component the webview renders
    ns,       \* window.__TERRARIUM_FILE_PATH__ (storage namespace)
    tasks     \* in-flight async bundles

vars == <<created, closed, reg, watch, shown, ns, tasks>>

alive == created \ closed

Init ==
    /\ created = {Main}
    /\ closed = {}
    /\ reg = [l \in Labels |-> None]
    /\ watch = [l \in Labels |-> None]
    /\ shown = [l \in Labels |-> None]
    /\ ns = [l \in Labels |-> None]
    /\ tasks = {}

Task(k, l, f) == [kind |-> k, label |-> l, file |-> f]

\* Fixed: does the registry still say `l` shows `f`?
Current(l, f) == l \notin closed /\ reg[l] = f

-----------------------------------------------------------------------------
\* The frontend calls open_file while nothing is rendered yet
\* (`fileLoaded` is still false).
FrontOpen(l, f) ==
    /\ l \in alive
    /\ shown[l] = None
    /\ ns' = [ns EXCEPT ![l] = f]
    /\ tasks' = tasks \cup {Task("open", l, f)}
    /\ IF Fixed
         THEN /\ reg' = [reg EXCEPT ![l] = f]
              /\ watch' = [watch EXCEPT ![l] = None]
         ELSE UNCHANGED <<reg, watch>>
    /\ UNCHANGED <<created, closed, shown>>

\* open_file resumes after `bundle_tsx(..).await`.
OpenDone(t) ==
    /\ t.kind = "open"
    /\ tasks' = tasks \ {t}
    /\ LET l == t.label f == t.file IN
       IF Fixed
         THEN IF Current(l, f)
                THEN /\ watch' = [watch EXCEPT ![l] = f]
                     /\ shown' = [shown EXCEPT ![l] = f]
                     /\ UNCHANGED reg
                ELSE UNCHANGED <<reg, watch, shown>>  \* Err(superseded), ignored
         ELSE \* v1.0.1: unconditional insert; the promise renders if alive
              /\ reg' = [reg EXCEPT ![l] = f]
              /\ watch' = [watch EXCEPT ![l] = f]
              /\ shown' = IF l \in alive THEN [shown EXCEPT ![l] = f] ELSE shown
    /\ UNCHANGED <<created, closed, ns>>

\* A new window is created for f and registered before the spawned bundle.
NewWindow(f) ==
    \E l \in NewLabels \ created :
        /\ created' = created \cup {l}
        /\ reg' = [reg EXCEPT ![l] = f]
        /\ tasks' = tasks \cup {Task("spawn", l, f)}
        /\ UNCHANGED <<closed, watch, shown, ns>>

\* spawn_bundle_and_watch resumes after the bundle.
SpawnDone(t) ==
    /\ t.kind = "spawn"
    /\ tasks' = tasks \ {t}
    /\ LET l == t.label f == t.file IN
       IF Fixed
         THEN IF Current(l, f)
                THEN /\ ns' = [ns EXCEPT ![l] = f]
                     /\ shown' = [shown EXCEPT ![l] = f]
                     /\ watch' = [watch EXCEPT ![l] = f]
                ELSE UNCHANGED <<ns, shown, watch>>
         ELSE \* v1.0.1: set path + emit if the webview exists, then attach the
              \* watcher to whatever entry the label has now.
              /\ ns' = IF l \in alive THEN [ns EXCEPT ![l] = f] ELSE ns
              /\ shown' = IF l \in alive THEN [shown EXCEPT ![l] = f] ELSE shown
              /\ watch' = IF reg[l] # None THEN [watch EXCEPT ![l] = f] ELSE watch
    /\ UNCHANGED <<created, closed, reg>>

\* RunEvent::Opened for a single file (several files repeat the loop body).
FinderOpen(f) ==
    LET claimMain == IF Fixed THEN reg[Main] = None /\ Main \notin closed
                              ELSE reg[Main] = None
    IN
    IF claimMain
      THEN /\ reg' = [reg EXCEPT ![Main] = f]
           /\ watch' = [watch EXCEPT ![Main] = None]
           /\ ns' = IF Main \in alive THEN [ns EXCEPT ![Main] = f] ELSE ns
           /\ tasks' = tasks \cup {Task("spawn", Main, f)}
           /\ UNCHANGED <<created, closed, shown>>
      ELSE IF \E l \in Labels : reg[l] = f
             THEN UNCHANGED vars                     \* "already open"
             ELSE NewWindow(f)

\* Closing the last window quits the app, so keep at least one.
Destroy(l) ==
    /\ l \in alive
    /\ Cardinality(alive) > 1
    /\ closed' = closed \cup {l}
    /\ reg' = [reg EXCEPT ![l] = None]
    /\ watch' = [watch EXCEPT ![l] = None]
    /\ shown' = [shown EXCEPT ![l] = None]
    /\ UNCHANGED <<created, ns, tasks>>

Next ==
    \/ \E l \in Labels, f \in Files : FrontOpen(l, f)
    \/ \E f \in Files : NewWindow(f) \/ FinderOpen(f)
    \/ \E t \in tasks : OpenDone(t) \/ SpawnDone(t)
    \/ \E l \in Labels : Destroy(l)

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
Busy(l) == \E t \in tasks : t.label = l

\* A closed window keeps no entry (and so no watcher) in the registry. An
\* entry for a closed label means a watcher that rebuilds forever for nobody,
\* a Finder open swallowed as "already open", or a Finder open routed to a
\* window that no longer exists.
RegistryOnlyLive == \A l \in Labels : reg[l] # None => l \notin closed

\* A window's watcher watches the file the registry says the window has.
WatcherMatchesFile == \A l \in Labels : watch[l] # None => watch[l] = reg[l]

\* Once a window has no bundle in flight, the component it renders reads and
\* writes its own storage namespace...
StorageMatchesShown ==
    \A l \in alive : (shown[l] # None /\ ~Busy(l)) => ns[l] = shown[l]

\* ...and request_bundle / hot reload rebuild the file it is showing.
RegistryMatchesShown ==
    \A l \in alive : (shown[l] # None /\ ~Busy(l)) => reg[l] = shown[l]

TypeOK ==
    /\ created \subseteq Labels /\ closed \subseteq created
    /\ reg \in [Labels -> FileOrNone] /\ watch \in [Labels -> FileOrNone]
    /\ shown \in [Labels -> FileOrNone] /\ ns \in [Labels -> FileOrNone]
=============================================================================
