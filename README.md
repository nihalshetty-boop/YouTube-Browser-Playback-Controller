# YouTube Playback Speed Controller

A browser extension that allows you to control YouTube video playback speed.

## Features

- Control playback speed from 0.25x to 4.0x
- Preset speed buttons (0.25x, 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x)
- Custom speed input for precise control
- Remembers your preferred speed across videos
- Works on all YouTube video pages

## Installation

### Chrome/Edge/Brave

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/` for Edge)
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select this folder (`Browser-Playback-Controller`)
5. The extension should now appear in your extensions list

### Firefox

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from this folder

## Usage

1. Navigate to any YouTube video page
2. Click the extension icon in your browser toolbar
3. Select a preset speed or enter a custom speed
4. The video playback speed will update immediately

## How It Works

- **Content Script** (`content.js`): Injected into YouTube pages to interact with the video player
- **Popup UI** (`popup.html/js/css`): Provides the interface for controlling playback speed
- **Manifest** (`manifest.json`): Defines the extension structure and permissions

The extension directly manipulates the HTML5 video element's `playbackRate` property, which YouTube uses for its video player.

## Permissions

- `activeTab`: To access the current YouTube tab
- `storage`: To save your preferred playback speed
- `host_permissions` for `youtube.com`: To inject content scripts on YouTube pages

## Development

To modify the extension:

1. Make your changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Notes

- The extension works by directly accessing the video element, so it should continue working even if YouTube changes their UI
- Speed preferences are saved locally in your browser
- The extension automatically restores your saved speed when you navigate to a new video

## Disclaimer

This extension is not affiliated with, endorsed by, or connected to YouTube or Google. 
It is an independent project that uses standard browser APIs to control video playback speed.

This extension:
- Does not download or store video content
- Does not bypass any security measures
- Does not interfere with advertisements
- Uses only standard HTML5 video playback controls

Use at your own discretion.
