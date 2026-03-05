cask "terrarium" do
  version "0.3.0"

  if Hardware::CPU.arm?
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_aarch64.dmg"
    sha256 "13177b1fc3b3b94267a6b08e361afdd6afcecf45d449bc6e14083345c676e34e"
  else
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_x64.dmg"
    sha256 "7709f2e42ef52ef926f974dde497e61676307f60453cfb9dd5e7eeb7f5ce3fa2"
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
