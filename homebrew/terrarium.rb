cask "terrarium" do
  version "1.0.2"

  if Hardware::CPU.arm?
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_aarch64.dmg"
    sha256 "57a60b9cda3a9636f7089d6f359d9dbc9284cd804914deec03c739436c6c2d91"
  else
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_x64.dmg"
    sha256 "32b934d9b60919a7033d2b0eaff4c1ac1af99076f675ea5b3a8a4f16e056f5e8"
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
