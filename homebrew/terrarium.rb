cask "terrarium" do
  version "1.0.0"

  if Hardware::CPU.arm?
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_aarch64.dmg"
    sha256 "89f9b177ed3ffb06e74d8c7a1d2318cac39df3ddf8706bfe1320dae22b6d9a2d"
  else
    url "https://github.com/michellemayes/terrarium/releases/download/v#{version}/Terrarium_#{version}_x64.dmg"
    sha256 "ebd29e86d0a6ec20c06e8a3ec4dbddc6cc131eb596edb3ce4d1c1e0ab7357117"
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
