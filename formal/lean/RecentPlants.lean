/-!
# Plant assignment on the recent-files shelf

Model of `record_recent` in `src-tauri/src/recent.rs`. Every shelf entry has a
plant (0–5) and the code says it picks "a plant type not already on the shelf
when possible". The shelf holds at most `MAX_RECENT = 6` entries and there are
`NUM_PLANT_TYPES = 6` plants, so distinct plants are always possible.

* `recordV1` is the logic in v1.0.1. When the shelf is full it counts the
  plant of the entry that `truncate(MAX_RECENT)` is about to evict as used,
  finds no free plant, falls back to the hash, and puts two identical plants
  on the shelf. `v1_duplicates_plants` is a concrete counterexample.
* `recordFixed` only counts the plants of the entries that survive the
  truncation. `recordFixed_preserves_shelf` proves for every shelf, path and
  hash value that the plants stay distinct (along with the other shelf
  invariants).

Abstractions: paths are `Nat` (only equality matters), `plant_index` is the
arbitrary input `preferred`, and the timestamp is dropped. Rust's
`list.remove(position(path))` is `l.erase e`, where `e` is the first entry
with that path: it removes the first element equal to `e`, which is that same
entry.

Check with `lean RecentPlants.lean` (no dependencies beyond core Lean).
-/

structure Entry where
  path : Nat
  plant : Nat
deriving DecidableEq, Repr

def maxRecent : Nat := 6
def numPlants : Nat := 6

/-- `if used.contains(&preferred) { (0..6).find(|i| !used.contains(i)).unwrap_or(preferred) } else { preferred }` -/
def pickPlant (used : List Nat) (preferred : Nat) : Nat :=
  if preferred ∈ used then
    ((List.range numPlants).find? (fun i => decide (i ∉ used))).getD preferred
  else preferred

def bump (l : List Entry) (e : Entry) : List Entry :=
  (e :: l.erase e).take maxRecent

/-- v1.0.1: `used` is every plant on the shelf before inserting. -/
def recordV1 (l : List Entry) (path preferred : Nat) : List Entry :=
  match l.find? (fun e => e.path == path) with
  | some e => bump l e
  | none =>
    ({ path, plant := pickPlant (l.map (·.plant)) preferred } :: l).take maxRecent

/-- Fixed: `used` is the plants of the entries kept after truncation. -/
def recordFixed (l : List Entry) (path preferred : Nat) : List Entry :=
  match l.find? (fun e => e.path == path) with
  | some e => bump l e
  | none =>
    ({ path, plant := pickPlant ((l.take (maxRecent - 1)).map (·.plant)) preferred } :: l).take
      maxRecent

/-- What the shelf should always satisfy. -/
def Shelf (l : List Entry) : Prop :=
  (l.map (·.path)).Nodup ∧ (l.map (·.plant)).Nodup ∧ l.length ≤ maxRecent ∧
    ∀ e ∈ l, e.plant < numPlants

instance (l : List Entry) : Decidable (Shelf l) := by unfold Shelf; infer_instance

/-! ## The bug -/

/-- A full shelf with all six plants, oldest entry (path 5) last. -/
def fullShelf : List Entry := [⟨0, 0⟩, ⟨1, 1⟩, ⟨2, 2⟩, ⟨3, 3⟩, ⟨4, 4⟩, ⟨5, 5⟩]

/-- Opening a new file whose hash prefers plant 0 evicts plant 5 but reuses 0. -/
example : (recordV1 fullShelf 6 0).map (·.plant) = [0, 0, 1, 2, 3, 4] := by decide

theorem v1_duplicates_plants :
    ∃ l path preferred, Shelf l ∧ preferred < numPlants ∧ ¬ Shelf (recordV1 l path preferred) :=
  ⟨fullShelf, 6, 0, by decide, by decide, by decide⟩

/-- The fixed version picks the evicted plant instead. -/
example : (recordFixed fullShelf 6 0).map (·.plant) = [5, 0, 1, 2, 3, 4] := by decide

/-! ## The fix is correct -/

/-- Pigeonhole: a list shorter than `n` misses some number below `n`. -/
theorem exists_not_mem_of_length_lt :
    ∀ (n : Nat) (s : List Nat), s.length < n → ∃ i, i < n ∧ i ∉ s
  | 0, _, h => absurd h (Nat.not_lt_zero _)
  | n + 1, s, h => by
    by_cases hn : n ∈ s
    · have hlen : (s.erase n).length < n := by
        have := List.length_pos_of_mem hn
        rw [List.length_erase_of_mem hn]; omega
      obtain ⟨i, hi, his⟩ := exists_not_mem_of_length_lt n (s.erase n) hlen
      refine ⟨i, by omega, fun hmem => his ?_⟩
      exact (List.mem_erase_of_ne (Nat.ne_of_lt hi)).2 hmem
    · exact ⟨n, by omega, hn⟩

theorem pickPlant_spec (used : List Nat) (preferred : Nat)
    (hlen : used.length < numPlants) (hp : preferred < numPlants) :
    pickPlant used preferred ∉ used ∧ pickPlant used preferred < numPlants := by
  unfold pickPlant
  split
  · rename_i hmem
    cases hfind : (List.range numPlants).find? (fun i => decide (i ∉ used)) with
    | none =>
      obtain ⟨i, hi, hiu⟩ := exists_not_mem_of_length_lt numPlants used hlen
      have := List.find?_eq_none.1 hfind i (List.mem_range.2 hi)
      simp [hiu] at this
    | some x =>
      have hx := List.find?_some hfind
      have hxr := List.mem_range.1 (List.mem_of_find?_eq_some hfind)
      simp only [decide_eq_true_eq] at hx
      exact ⟨hx, hxr⟩
  · rename_i hmem
    exact ⟨hmem, hp⟩

theorem bump_preserves_shelf (l : List Entry) (e : Entry) (he : e ∈ l) (h : Shelf l) :
    Shelf (bump l e) := by
  obtain ⟨hpath, hplant, _, hlt⟩ := h
  have hperm : (e :: l.erase e).Perm l := (List.perm_cons_erase he).symm
  unfold bump
  refine ⟨?_, ?_, ?_, ?_⟩
  · rw [List.map_take]
    exact ((hperm.map _).nodup_iff.2 hpath).sublist (List.take_sublist _ _)
  · rw [List.map_take]
    exact ((hperm.map _).nodup_iff.2 hplant).sublist (List.take_sublist _ _)
  · simp only [List.length_take]; exact Nat.min_le_left _ _
  · intro x hx
    exact hlt x (hperm.mem_iff.1 (List.mem_of_mem_take hx))

theorem recordFixed_preserves_shelf (l : List Entry) (path preferred : Nat)
    (h : Shelf l) (hp : preferred < numPlants) : Shelf (recordFixed l path preferred) := by
  unfold recordFixed
  split
  · rename_i e hfind
    exact bump_preserves_shelf l e (List.mem_of_find?_eq_some hfind) h
  · rename_i hfind
    obtain ⟨hpath, hplant, _, hlt⟩ := h
    have hnew : ∀ x ∈ l, x.path ≠ path := by
      intro x hx heq
      have := List.find?_eq_none.1 hfind x hx
      simp [heq] at this
    let kept := l.take (maxRecent - 1)
    have hkept : kept.Sublist l := List.take_sublist _ _
    have hused_len : (kept.map (·.plant)).length < numPlants := by
      simp only [List.length_map, kept, List.length_take]
      unfold maxRecent numPlants; omega
    obtain ⟨hfree, hrange⟩ := pickPlant_spec _ preferred hused_len hp
    show Shelf (List.take (maxRecent - 1 + 1) (_ :: l))
    rw [List.take_succ_cons]
    refine ⟨?_, ?_, ?_, ?_⟩
    · rw [List.map_cons, List.nodup_cons]
      refine ⟨?_, (hpath.sublist (hkept.map _))⟩
      intro hm
      obtain ⟨x, hx, hxp⟩ := List.mem_map.1 hm
      exact hnew x (hkept.subset hx) hxp
    · rw [List.map_cons, List.nodup_cons]
      exact ⟨hfree, hplant.sublist (hkept.map _)⟩
    · simp only [List.length_cons, List.length_take]
      unfold maxRecent; omega
    · intro x hx
      rcases List.mem_cons.1 hx with rfl | hx
      · exact hrange
      · exact hlt x (hkept.subset hx)

/-- Pruning dead files (`get_recent_files`) also keeps the shelf valid. -/
theorem prune_preserves_shelf (l : List Entry) (live : Entry → Bool) (h : Shelf l) :
    Shelf (l.filter live) := by
  obtain ⟨hpath, hplant, hlen, hlt⟩ := h
  have hsub : (l.filter live).Sublist l := List.filter_sublist
  exact ⟨hpath.sublist (hsub.map _), hplant.sublist (hsub.map _),
    Nat.le_trans hsub.length_le hlen, fun x hx => hlt x (hsub.subset hx)⟩
