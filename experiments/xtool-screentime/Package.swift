// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ScreenTimeLab",
    platforms: [.iOS(.v17)],
    products: [.library(name: "ScreenTimeLab", targets: ["ScreenTimeLab"])],
    targets: [.target(name: "ScreenTimeLab")]
)
