Pod::Spec.new do |s|
  s.name = 'RTUScreenTime'
  s.version = '1.0.0'
  s.summary = 'Read to Unlock Screen Time integration'
  s.description = 'A local Expo module using authorized Family Controls tokens.'
  s.license = { :type => 'MIT' }
  s.author = 'Read to Unlock'
  s.homepage = 'https://github.com/alitheprogrammergod/readtounlock'
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.0'
  s.source = { :git => 'https://github.com/alitheprogrammergod/readtounlock.git', :tag => s.version.to_s }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'SwiftUI'
  s.source_files = '**/*.{swift,h,m,mm}'
end
