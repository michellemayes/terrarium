#!/usr/bin/env bash
# Runs every TLA+ model and the Lean proofs, and checks each gives its
# expected result: the v1.0.1 models must fail with the listed property, the
# fixed models must pass. Needs Java 11+ and Lean 4 (elan); downloads
# tla2tools.jar on first use (override with TLA2TOOLS=/path/to/jar).
set -uo pipefail
cd "$(dirname "$0")"

TLA_JAR="${TLA2TOOLS:-$HOME/.cache/terrarium/tla2tools.jar}"
if [ ! -f "$TLA_JAR" ]; then
  mkdir -p "$(dirname "$TLA_JAR")"
  curl -fsSL -o "$TLA_JAR" https://github.com/tlaplus/tlaplus/releases/download/v1.8.0/tla2tools.jar
fi

failures=0

check() {
  local spec=$1 cfg=$2 expected=$3 out got meta
  meta=$(mktemp -d)
  out=$(cd tla && java -XX:+UseParallelGC -cp "$TLA_JAR" tlc2.TLC -workers auto \
    -noGenerateSpecTE -metadir "$meta" -config "$cfg" "$spec" 2>&1)
  rm -rf "$meta"
  if grep -q "No error has been found" <<<"$out"; then
    got=pass
  else
    got=$(grep -oE '(Invariant|Action property|Temporal property) [A-Za-z]+ is violated' <<<"$out" |
      awk '{print $(NF-2)}' | head -1)
    got=${got:-error}
  fi
  if [ "$got" = "$expected" ]; then
    printf 'ok    %-34s %s\n' "$cfg" "$got"
  else
    printf 'FAIL  %-34s expected %s, got %s\n' "$cfg" "$expected" "$got"
    failures=$((failures + 1))
  fi
}

#     spec               config                            expected
check HotReload.tla      HotReload_converges.cfg           Converges
check HotReload.tla      HotReload_debounce.cfg            Converges
check HotReload.tla      HotReload_monotonic.cfg           Monotonic
check HotReloadFixed.tla HotReloadFixed.cfg                pass
check HotReloadFixed.tla HotReloadFixed_sanity.cfg         NeverSettlesAtMax
check Windows.tla        Windows_RegistryOnlyLive.cfg      RegistryOnlyLive
check Windows.tla        Windows_WatcherMatchesFile.cfg    WatcherMatchesFile
check Windows.tla        Windows_StorageMatchesShown.cfg   StorageMatchesShown
check Windows.tla        Windows_RegistryMatchesShown.cfg  RegistryMatchesShown
check Windows.tla        WindowsFixed.cfg                  pass
check RecentFiles.tla    RecentFiles.cfg                   NoLostEntries
check RecentFiles.tla    RecentFilesFixed.cfg              pass

if (cd lean && lean RecentPlants.lean); then
  printf 'ok    %-34s %s\n' RecentPlants.lean proved
else
  printf 'FAIL  %-34s\n' RecentPlants.lean
  failures=$((failures + 1))
fi

exit $((failures > 0))
