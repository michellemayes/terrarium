------------------------------ MODULE HotReload ------------------------------
(***************************************************************************)
(* Model of the hot-reload pipeline as implemented in v1.0.1:              *)
(*                                                                         *)
(*   lib.rs     open_file / spawn_bundle_and_watch: bundle first, then     *)
(*              call watch_file()                                          *)
(*   watcher.rs one thread drains FS events; a leading-edge debounce       *)
(*              (`should_rebuild(last_rebuild, 300)`, with `last_rebuild`  *)
(*              initialised to Instant::now()) decides whether an event    *)
(*              starts a rebuild; every accepted event spawns a detached   *)
(*              async bundle task that emits `bundle-ready` when it ends.  *)
(*                                                                         *)
(* The file is abstracted to a version counter. A bundle "reads" the file  *)
(* at some point after it starts and later renders what it read.           *)
(*                                                                         *)
(* Properties                                                              *)
(*   Converges   : once every event is handled and no bundle is running,   *)
(*                 the window shows the latest version on disk. (Nothing   *)
(*                 else can happen from such a state except a new save, so *)
(*                 this safety property is the "eventually shows the       *)
(*                 latest save" requirement.)                              *)
(*   Monotonic   : the rendered version never goes backwards.              *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS MaxVer,    \* number of distinct file versions (saves + 1)
          Debounce,  \* debounce window in clock ticks
          MaxTime,   \* clock bound, keeps the state space finite
          T0         \* clock value when the file is opened

VARIABLES now,          \* discrete clock
          fileVer,      \* version currently on disk
          watching,     \* has watch_file() registered the watcher yet?
          pending,      \* FS events queued in the mpsc channel
          lastRebuild,  \* `last_rebuild` in the watcher thread
          jobs,         \* in-flight bundle tasks
          nextId,
          displayed     \* version rendered in the webview (0 = nothing)

vars == <<now, fileVer, watching, pending, lastRebuild, jobs, nextId, displayed>>

Unread == 0
Job(id) == [id |-> id, read |-> Unread]

Init ==
    /\ now = T0
    /\ fileVer = 1
    /\ watching = FALSE
    /\ pending = 0
    /\ lastRebuild = T0
    /\ jobs = {Job(0)}          \* the initial bundle started by open_file
    /\ nextId = 1
    /\ displayed = 0

Tick ==
    /\ now < MaxTime
    /\ now' = now + 1
    /\ UNCHANGED <<fileVer, watching, pending, lastRebuild, jobs, nextId, displayed>>

\* The user (or an editor / formatter / Claude Code) saves the file. The OS
\* only reports it if the watcher is registered.
Save ==
    /\ fileVer < MaxVer
    /\ fileVer' = fileVer + 1
    /\ pending' = IF watching THEN pending + 1 ELSE pending
    /\ UNCHANGED <<now, watching, lastRebuild, jobs, nextId, displayed>>

\* open_file: the watcher is created only after the initial bundle returned.
StartWatcher ==
    /\ ~watching
    /\ \A j \in jobs : j.id # 0
    /\ watching' = TRUE
    /\ lastRebuild' = now       \* `let mut last_rebuild = Instant::now();`
    /\ UNCHANGED <<now, fileVer, pending, jobs, nextId, displayed>>

\* watcher.rs: `for event in rx { if !should_rebuild(..) { continue; } ... }`
HandleEvent ==
    /\ pending > 0
    /\ pending' = pending - 1
    /\ IF now - lastRebuild >= Debounce
         THEN /\ jobs' = jobs \cup {Job(nextId)}
              /\ nextId' = nextId + 1
              /\ lastRebuild' = now
         ELSE UNCHANGED <<jobs, nextId, lastRebuild>>
    /\ UNCHANGED <<now, fileVer, watching, displayed>>

\* A running bundler reads the source file.
Read(j) ==
    /\ j.read = Unread
    /\ jobs' = (jobs \ {j}) \cup {[j EXCEPT !.read = fileVer]}
    /\ UNCHANGED <<now, fileVer, watching, pending, lastRebuild, nextId, displayed>>

\* The bundle task finishes and the window renders what it read.
Finish(j) ==
    /\ j.read # Unread
    /\ jobs' = jobs \ {j}
    /\ displayed' = j.read
    /\ UNCHANGED <<now, fileVer, watching, pending, lastRebuild, nextId>>

Next ==
    \/ Tick \/ Save \/ StartWatcher \/ HandleEvent
    \/ \E j \in jobs : Read(j) \/ Finish(j)

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
Quiescent == watching /\ pending = 0 /\ jobs = {}

Converges == Quiescent => displayed = fileVer

Monotonic == [][displayed' >= displayed]_displayed

\* State constraint used by HotReload_debounce.cfg.
NoSaveBeforeWatcher == watching \/ fileVer = 1

TypeOK ==
    /\ fileVer \in 1..MaxVer
    /\ displayed \in 0..MaxVer
    /\ pending \in Nat
=============================================================================
