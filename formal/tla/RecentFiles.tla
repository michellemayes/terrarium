----------------------------- MODULE RecentFiles -----------------------------
(***************************************************************************)
(* Concurrent writers of ~/.terrarium/recent-files.json (recent.rs).       *)
(*                                                                         *)
(* Each successful spawn_bundle_and_watch / open_file calls record_recent  *)
(* (read, modify, write) on a tokio worker thread, so opening several      *)
(* files at once runs them in parallel; get_recent_files (the shelf) does  *)
(* its own read-prune-write. In v1.0.1 there is no lock and the write is   *)
(* std::fs::write, which truncates the file before writing it: a reader in *)
(* between sees invalid JSON and read_recent() returns [].                 *)
(*                                                                         *)
(* Fixed = TRUE: one process-wide lock around every read-modify-write, and *)
(* the file is replaced atomically (write a temp file, then rename).       *)
(***************************************************************************)
EXTENDS FiniteSets

CONSTANTS Recorders,  \* processes calling record_recent(self)
          Fixed

Shelf == "shelf"      \* get_recent_files, prunes nothing here
Procs == Recorders \cup {Shelf}
Json(entries) == [valid |-> TRUE, entries |-> entries]
Partial == [valid |-> FALSE, entries |-> {}]  \* truncated / half-written file

VARIABLES file, pc, local, lock

vars == <<file, pc, local, lock>>

Init ==
    /\ file = Json({})
    /\ pc = [p \in Procs |-> IF Fixed THEN "lock" ELSE "read"]
    /\ local = [p \in Procs |-> {}]
    /\ lock = "free"

Acquire(p) ==
    /\ pc[p] = "lock" /\ lock = "free"
    /\ lock' = p /\ pc' = [pc EXCEPT ![p] = "read"]
    /\ UNCHANGED <<file, local>>

Read(p) ==
    /\ pc[p] = "read"
    /\ local' = [local EXCEPT ![p] = IF file.valid THEN file.entries ELSE {}]
    /\ pc' = [pc EXCEPT ![p] = IF Fixed THEN "write" ELSE "trunc"]
    /\ UNCHANGED <<file, lock>>

\* std::fs::write: open(O_TRUNC) happens before the bytes are written.
Truncate(p) ==
    /\ pc[p] = "trunc"
    /\ file' = Partial
    /\ pc' = [pc EXCEPT ![p] = "write"]
    /\ UNCHANGED <<local, lock>>

Write(p) ==
    /\ pc[p] = "write"
    /\ file' = Json(IF p = Shelf THEN local[p] ELSE local[p] \cup {p})
    /\ pc' = [pc EXCEPT ![p] = "done"]
    /\ lock' = IF Fixed THEN "free" ELSE lock
    /\ UNCHANGED local

Next == \E p \in Procs : Acquire(p) \/ Read(p) \/ Truncate(p) \/ Write(p)

Spec == Init /\ [][Next]_vars

\* When everyone has finished, every recorded file is on the shelf.
NoLostEntries == (\A p \in Procs : pc[p] = "done") => file = Json(Recorders)
=============================================================================
