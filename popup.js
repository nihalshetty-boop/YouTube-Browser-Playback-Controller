// Popup script for controlling playback speed

document.addEventListener('DOMContentLoaded', () => {
  const speedButtons = document.querySelectorAll('.speed-btn');
  const customSpeedInput = document.getElementById('customSpeed');
  const applyCustomBtn = document.getElementById('applyCustom');
  const currentSpeedDisplay = document.getElementById('currentSpeed');

  // Get current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // Skip chrome:// and extension pages
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://') || 
        currentTab.url.startsWith('edge://') || currentTab.url.startsWith('moz-extension://')) {
      document.querySelector('.container').innerHTML = 
        '<p style="padding: 20px; text-align: center;">This extension works on web pages with videos</p>';
      return;
    }

    // Function to inject content script into main page and all frames
    function ensureContentScript(callback) {
      chrome.tabs.sendMessage(currentTab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded, inject it programmatically
          console.log('Injecting content script...');
          
          // Inject into main page
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
          }).then(() => {
            // Also inject into all frames (for YouTube iframes)
            chrome.scripting.executeScript({
              target: { tabId: currentTab.id, allFrames: true },
              files: ['content.js']
            }).then(() => {
              // Wait a bit for script to initialize
              setTimeout(() => {
                callback();
              }, 200);
            }).catch((error) => {
              // If iframe injection fails, still try with main page
              console.log('Iframe injection failed (may be cross-origin), continuing with main page...');
              setTimeout(() => {
                callback();
              }, 200);
            });
          }).catch((error) => {
            console.error('Failed to inject script:', error);
            document.querySelector('.info').innerHTML = 
              '<p style="color: red; padding: 10px;">Failed to inject script. Make sure you\'re on a web page.</p>';
          });
        } else {
          callback();
        }
      });
    }

    // Get current speed with retry
    function getCurrentSpeed() {
      chrome.tabs.sendMessage(currentTab.id, { action: 'getSpeed' }, (response) => {
        if (!chrome.runtime.lastError && response && response.speed) {
          updateSpeedDisplay(response.speed);
          highlightActiveButton(response.speed);
          customSpeedInput.value = response.speed;
          return;
        }
        
        // Main frame failed, try iframes
        chrome.webNavigation.getAllFrames({ tabId: currentTab.id }, (frames) => {
          if (!frames || frames.length === 0) {
            document.querySelector('.info').innerHTML = 
              '<p style="color: red; padding: 10px;">No video found on this page.</p>';
            return;
          }
          
          let checkedFrames = 0;
          frames.forEach((frame) => {
            if (frame.frameId === 0) {
              checkedFrames++;
              if (checkedFrames === frames.length) {
                document.querySelector('.info').innerHTML = 
                  '<p style="color: orange; padding: 10px;">No video found. Make sure a video is playing.</p>';
              }
              return;
            }
            
            chrome.tabs.sendMessage(currentTab.id, { action: 'getSpeed' }, { frameId: frame.frameId }, (frameResponse) => {
              checkedFrames++;
              if (!chrome.runtime.lastError && frameResponse && frameResponse.speed) {
                updateSpeedDisplay(frameResponse.speed);
                highlightActiveButton(frameResponse.speed);
                customSpeedInput.value = frameResponse.speed;
                return;
              }
              
              if (checkedFrames === frames.length) {
                document.querySelector('.info').innerHTML = 
                  '<p style="color: orange; padding: 10px;">No video found. Make sure a video is playing.</p>';
              }
            });
          });
        });
      });
    }

    // Try to get current speed
    ensureContentScript(() => {
      getCurrentSpeed();
    });

    // Handle preset speed buttons
    speedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        setSpeed(speed, currentTab.id);
      });
    });

    // Handle custom speed
    applyCustomBtn.addEventListener('click', () => {
      const speed = parseFloat(customSpeedInput.value);
      if (speed >= 0.25 && speed <= 4) {
        setSpeed(speed, currentTab.id);
      } else {
        alert('Speed must be between 0.25 and 4.0');
      }
    });

    // Allow Enter key on custom speed input
    customSpeedInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        applyCustomBtn.click();
      }
    });
  });

  function setSpeed(speed, tabId) {
    // Ensure content script is loaded before setting speed
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingResponse) => {
      if (chrome.runtime.lastError) {
        // Inject script if not loaded (into main page and all frames)
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        }).then(() => {
          // Also inject into all frames for YouTube iframes
          chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            files: ['content.js']
          }).then(() => {
            setTimeout(() => {
              performSetSpeed(speed, tabId);
            }, 200);
          }).catch((error) => {
            // If iframe injection fails, still try with main page
            console.log('Iframe injection failed, continuing with main page...');
            setTimeout(() => {
              performSetSpeed(speed, tabId);
            }, 200);
          });
        }).catch((error) => {
          console.error('Failed to inject script:', error);
          document.querySelector('.info').innerHTML = 
            '<p style="color: red; padding: 10px;">Failed to inject script. Please refresh the page.</p>';
        });
      } else {
        performSetSpeed(speed, tabId);
      }
    });
  }

  function performSetSpeed(speed, tabId) {
    // Try main frame first (frameId 0)
    chrome.tabs.sendMessage(tabId, { action: 'setSpeed', speed }, (response) => {
      if (!chrome.runtime.lastError && response && response.success) {
        handleSpeedResponse(response, speed);
        return;
      }
      
      // Main frame failed, try to find video in iframes
      chrome.webNavigation.getAllFrames({ tabId: tabId }, (frames) => {
        if (!frames || frames.length === 0) {
          handleSpeedResponse(response, speed);
          return;
        }
        
        // Try each frame until we find one with a video
        let completedFrames = 0;
        let successFound = false;
        
        frames.forEach((frame) => {
          // Skip main frame (already tried)
          if (frame.frameId === 0) {
            completedFrames++;
            if (completedFrames === frames.length && !successFound) {
              handleSpeedResponse(response, speed);
            }
            return;
          }
          
          chrome.tabs.sendMessage(tabId, { action: 'setSpeed', speed }, { frameId: frame.frameId }, (frameResponse) => {
            completedFrames++;
            
            if (!chrome.runtime.lastError && frameResponse && frameResponse.success && !successFound) {
              successFound = true;
              handleSpeedResponse(frameResponse, speed);
              return;
            }
            
            // If we've tried all frames and none worked
            if (completedFrames === frames.length && !successFound) {
              handleSpeedResponse(response, speed);
            }
          });
        });
      });
    });
  }

  function handleSpeedResponse(response, speed) {
    // Check if there was a runtime error (context invalidated)
    if (chrome.runtime.lastError) {
      // If context was invalidated, it's usually because extension was reloaded
      // This is harmless, just show a message
      if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
        document.querySelector('.info').innerHTML = 
          '<p style="color: orange; padding: 10px;">Extension was reloaded. Please refresh the page.</p>';
        return;
      }
      console.error('Error setting speed:', chrome.runtime.lastError.message);
      document.querySelector('.info').innerHTML = 
        '<p style="color: red; padding: 10px;">Error: ' + chrome.runtime.lastError.message + '<br>No video found on this page.</p>';
      return;
    }
    if (response && response.success) {
      updateSpeedDisplay(response.currentSpeed);
      highlightActiveButton(response.currentSpeed);
      customSpeedInput.value = response.currentSpeed;
      
      // Save to storage
      chrome.storage.local.set({ savedSpeed: response.currentSpeed });
      document.querySelector('.info').innerHTML = 
        '<p style="color: green; padding: 10px;">Speed set to ' + response.currentSpeed.toFixed(2) + 'x</p>';
    } else {
      console.error('Failed to set speed');
      document.querySelector('.info').innerHTML = 
        '<p style="color: red; padding: 10px;">Failed to set speed. Video may not be loaded yet or may be in an iframe.</p>';
    }
  }

  function updateSpeedDisplay(speed) {
    currentSpeedDisplay.textContent = speed.toFixed(2);
  }

  function highlightActiveButton(speed) {
    speedButtons.forEach(btn => {
      const btnSpeed = parseFloat(btn.dataset.speed);
      // Use approximate comparison for floating point
      if (Math.abs(btnSpeed - speed) < 0.01) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
});

