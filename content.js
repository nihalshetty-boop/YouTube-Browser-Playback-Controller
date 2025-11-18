// Content script that runs on web pages
// This script finds video elements and controls playback speed
// Works on YouTube.com and embedded YouTube videos on any website

(function() {
  'use strict';

  // Function to find the video element
  function getVideoElement() {
    return document.querySelector('video');
  }

  // Function to set playback speed
  function setPlaybackSpeed(speed) {
    const video = getVideoElement();
    if (video) {
      video.playbackRate = speed;
      console.log(`Playback speed set to ${speed}x`);
      return true;
    }
    return false;
  }

  // Function to get current playback speed
  function getPlaybackSpeed() {
    const video = getVideoElement();
    return video ? video.playbackRate : 1.0;
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Helper function to safely send response
    const safeSendResponse = (response) => {
      try {
        if (chrome.runtime.id) { // Check if extension context is still valid
          sendResponse(response);
        }
      } catch (error) {
        // Extension context invalidated - ignore silently
        console.log('[YouTube Speed Controller] Extension context invalidated, ignoring response');
      }
    };

    if (request.action === 'ping') {
      // Simple ping to check if content script is loaded
      safeSendResponse({ status: 'ready' });
      return true;
    }
    if (request.action === 'setSpeed') {
      const success = setPlaybackSpeed(request.speed);
      safeSendResponse({ success, currentSpeed: getPlaybackSpeed() });
    } else if (request.action === 'getSpeed') {
      safeSendResponse({ speed: getPlaybackSpeed() });
    }
    return true; // Keep message channel open for async response
  });

  // Add console log to confirm script loaded
  console.log('[YouTube Speed Controller] Content script loaded');

  // Watch for video element changes (YouTube is a SPA)
  const observer = new MutationObserver(() => {
    // When video changes, restore saved speed if available
    chrome.storage.local.get(['savedSpeed'], (result) => {
      if (result.savedSpeed) {
        const video = getVideoElement();
        if (video && video.readyState >= 2) {
          video.playbackRate = result.savedSpeed;
        }
      }
    });
  });

  // Start observing when DOM is ready
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  // Restore speed when video loads
  const video = getVideoElement();
  if (video) {
    video.addEventListener('loadedmetadata', () => {
      chrome.storage.local.get(['savedSpeed'], (result) => {
        if (result.savedSpeed) {
          video.playbackRate = result.savedSpeed;
        }
      });
    });
  }
})();

