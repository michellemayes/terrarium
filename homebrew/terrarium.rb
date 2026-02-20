cask "terrarium" do
  version "0.2.1"

  if Hardware::CPU.arm?
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_aarch64.dmg"
    sha256 "PLACEHOLDER_ARM64_SHA"
  else
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_x64.dmg"
    sha256 "PLACEHOLDER_X64_SHA"
  end

  name "Terrarium"
  desc "Tiny viewer for TSX components"
  homepage "https://github.com/michellemayes/terrarium"

  depends_on formula: "node@18"

  app "Terrarium.app"

  zap trash: [
    "~/.terrarium",
  ]
end
