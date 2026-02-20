cask "terrarium" do
  version "0.2.2"

  if Hardware::CPU.arm?
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_aarch64.dmg"
    sha256 "09482498179efce11d5836f135f4a4816bf8ac64854c9573f3e9d8650da9a607"
  else
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_x64.dmg"
    sha256 "2f2cb3b3bcb0dfd9719fb3fb8d2c5cdca8a0562979ff7ca7b8a7df756f862d02"
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
