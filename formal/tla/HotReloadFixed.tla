--------------------------- MODULE HotReloadFixed ---------------------------
(***************************************************************************)
(* The hot-reload pipeline after the fix (see HotReload.tla for v1.0.1):   *)
(*                                                                         *)
(*  - Before the initial bundle, open_file / spawn_bundle_and_watch take a *)
(*    FileStamp (mtime + len). When the watcher has been registered it     *)
(*    compares the stamp with the file and schedules a rebuild if the file *)
(*    changed in between, so a save made while the first bundle was        *)
(*    running is not lost.                                                 *)
(*  - The debounce is trailing-edge: a rebuild starts once no event has    *)
(*    arrived for `Debounce` ticks, so the last save always triggers one.  *)
(*  - Rebuilds run one at a time on the watcher thread; events that arrive *)
(*    meanwhile wait in the channel and cause another rebuild afterwards.  *)
(***************************************************************************)
EXTENDS Naturals

CONSTANTS MaxVer, Debounce, MaxTime

VARIABLES now, fileVer, stamp, initJob, wstate, deadline, pending, job, displayed

vars == <<now, fileVer, stamp, initJob, wstate, deadline, pending, job, displayed>>

Unread == 0

Init ==
    /\ now = 0
    /\ fileVer = 1
    /\ stamp = 1              \* FileStamp taken before the initial bundle
    /\ initJob = Unread       \* the initial bundle (run by open_file)
    /\ wstate = "off"         \* "off" | "idle" | "debounce" | "bundling" | "done"
    /\ deadline = 0
    /\ pending = 0
    /\ job = Unread
    /\ displayed = 0

Tick ==
    /\ now < MaxTime
    /\ now' = now + 1
    /\ UNCHANGED <<fileVer, stamp, initJob, wstate, deadline, pending, job, displayed>>

Save ==
    /\ fileVer < MaxVer
    /\ fileVer' = fileVer + 1
    /\ pending' = IF wstate = "off" THEN pending ELSE pending + 1
    /\ UNCHANGED <<now, stamp, initJob, wstate, deadline, job, displayed>>

InitRead ==
    /\ wstate = "off" /\ initJob = Unread
    /\ initJob' = fileVer
    /\ UNCHANGED <<now, fileVer, stamp, wstate, deadline, pending, job, displayed>>

\* The initial bundle returns and is rendered; then watch_file() runs.
InitFinishAndWatch ==
    /\ wstate = "off" /\ initJob # Unread
    /\ displayed' = initJob
    /\ IF fileVer # stamp
         THEN wstate' = "debounce" /\ deadline' = now + Debounce
         ELSE wstate' = "idle"     /\ deadline' = deadline
    /\ UNCHANGED <<now, fileVer, stamp, initJob, pending, job>>

\* Watcher thread receives a relevant event (blocking recv or recv_timeout).
Receive ==
    /\ wstate \in {"idle", "debounce"}
    /\ pending > 0
    /\ pending' = pending - 1
    /\ wstate' = "debounce"
    /\ deadline' = now + Debounce
    /\ UNCHANGED <<now, fileVer, stamp, initJob, job, displayed>>

\* recv_timeout expired: start the rebuild. (An event racing the timeout may
\* still be queued; it is handled after this rebuild.)
Fire ==
    /\ wstate = "debounce"
    /\ now >= deadline
    /\ wstate' = "bundling"
    /\ job' = Unread
    /\ UNCHANGED <<now, fileVer, stamp, initJob, deadline, pending, displayed>>

Read ==
    /\ wstate = "bundling" /\ job = Unread
    /\ job' = fileVer
    /\ UNCHANGED <<now, fileVer, stamp, initJob, wstate, deadline, pending, displayed>>

Finish ==
    /\ wstate = "bundling" /\ job # Unread
    /\ displayed' = job
    /\ wstate' = "idle"
    /\ job' = Unread
    /\ UNCHANGED <<now, fileVer, stamp, initJob, deadline, pending>>

Next == Tick \/ Save \/ InitRead \/ InitFinishAndWatch \/ Receive \/ Fire \/ Read \/ Finish

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
Quiescent == wstate = "idle" /\ pending = 0

Converges == Quiescent => displayed = fileVer

Monotonic == [][displayed' >= displayed]_displayed

\* Sanity check (expected to be violated): a quiescent state after every
\* save has happened is reachable, so Converges is not vacuous.
NeverSettlesAtMax == ~(Quiescent /\ fileVer = MaxVer)
=============================================================================
