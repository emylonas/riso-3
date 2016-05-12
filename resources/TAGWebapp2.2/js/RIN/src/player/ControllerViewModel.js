﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/Common.js">
/// <reference path="../core/Orchestrator.js">
/// <reference path="../utilities/SelfTest.js">

(function (rin) {
    /*global ko:true*/
    "use strict";
    rin.internal.getDeepState = function (deepstateParameter, narrativeUrl) {
        var deepstateUrl = "narrativeUrl={0}&begin={1}&action={2}&screenPlayId={3}".rinFormat(
            encodeURIComponent(rin.util.convertToAbsoluteUri(narrativeUrl)), // ger absolute url for the narrative
            deepstateParameter.state.animation.begin, deepstateParameter.state.animation.action, deepstateParameter.state.document.screenplayId);
        deepstateUrl += "&state={0}".rinFormat(encodeURIComponent(JSON.stringify(deepstateParameter.state.collectionReferences)));
        var queryStringStart = window.location.href.indexOf("?");
        deepstateUrl = (queryStringStart > 0 ?  window.location.href.substr(0,queryStringStart) : window.location.href) + "?" + deepstateUrl;
        return deepstateUrl;
    };

    rin.internal.PlayerControllerViewModel = function (orchestrator, playerControl) {
        var showControls = ko.observable(false),
            isPlayerReady = ko.observable(false),
            isHeaderVisible = ko.observable(false),
            isPlayPauseVisible = ko.observable(true),
            isInteractiveControlVisible = ko.observable(false),
            isRightContainerVisible = ko.observable(true),
            areShareButtonsVisible = ko.observable(true),
            isVolumeVisible = ko.observable(true),
            isSeekerVisible = ko.observable(true),
            isLoopVisible = ko.observable(true),
            isFullScreenControlVisible = ko.observable(true),
            areTroubleShootControlsVisible = ko.observable(false),
            interactionControls = ko.observable(null),
            title = ko.observable(""),
            branding = ko.observable(""),
            description = ko.observable(""),
            seekerViewModel = new rin.internal.SeekerControllerViewModel(orchestrator, playerControl),
            playPauseViewModel = new rin.internal.PlayPauseControllerViewModel(orchestrator, playerControl),
            loopViewModel = new rin.internal.loopControllerViewModel(orchestrator, playerControl),
            volumeControlViewModel = new rin.internal.VolumeControllerViewModel(orchestrator, playerControl),
            debugCurrentTime = ko.observable("0:00"),
            troubleShooterViewModel = new rin.internal.TroubleShooterViewModel(orchestrator, playerControl),
            seekToBeginningOnEnd = false,
            shareLinks = ko.observableArray([
                new rin.internal.MailDataViewModel(orchestrator)
            ]),
            removeInteractionControls = function () {
                interactionControls(null);
            },
            setInteractionControls = function (currentInteractingES) {
                if (typeof currentInteractingES.getInteractionControls === 'function') {
                    interactionControls(currentInteractingES.getInteractionControls());
                }
            },
            onPlayerReadyChanged = function (value) {
                if (true === value || false === value) {
                    isPlayerReady(value);
                } else {
                    rin.internal.debug.assert(false, "Boolean expected. Recieved: " + value.toString());
                }
            },
            onPlayerStateChanged = function (playerStateChangedEventArgs) {
                if (playerStateChangedEventArgs.currentState === rin.contracts.playerState.playing) {
                    removeInteractionControls();
                }
            },
            onInteractionModeStarted = function (eventArgs) {
                setInteractionControls(eventArgs.interactionES);
            },
            onNarrativeModeStarted = function (eventArgs) {
                // todo: hide player controls here.
            },
            onScreenplayEnded = function (eventArgs) {
                if (seekToBeginningOnEnd) orchestrator.pause(0);
            },
            onSeekChanged = function (eventArgs) {
                removeInteractionControls();
                showFooterControls(true);
            },
            showFooterControls = function (isShow) {
                if (isShow) {
                    // Check if current screenplay supports showing footer controls
                    var screenPlayId = orchestrator.currentScreenPlayId;
                    var screenPlayPropertyTable = orchestrator.getScreenPlayPropertyTable(screenPlayId);
                    var hideTimeline = screenPlayPropertyTable && screenPlayPropertyTable.isTransitionScreenPlay;
                    showControls(isShow && !hideTimeline);
                } else {
                    showControls(false);
                }
            },
            setControllerOptions = function () {
                var controllerOptions = orchestrator.playerConfiguration.controllerOptions || {};
                if (controllerOptions.header !== undefined)
                    isHeaderVisible(controllerOptions.header);

                if (controllerOptions.playPause !== undefined)
                    isPlayPauseVisible(controllerOptions.playPause);

                if (controllerOptions.share !== undefined)
                    areShareButtonsVisible(controllerOptions.share);

                if (controllerOptions.fullscreen !== undefined)
                    isFullScreenControlVisible(controllerOptions.fullscreen);

                if (controllerOptions.seeker !== undefined)
                    isSeekerVisible(controllerOptions.seeker);

                if (controllerOptions.volume !== undefined)
                    isVolumeVisible(controllerOptions.volume);

                if (controllerOptions.loop !== undefined)
                    isLoopVisible(controllerOptions.loop);

                seekToBeginningOnEnd = !!controllerOptions.seekToBeginningOnEnd;
            },
            toggleControls = function () {
                if (orchestrator.playerConfiguration.playerMode === rin.contracts.playerMode.AuthorerPreview && !orchestrator.playerConfiguration.isFromRinPreviewer) {
                    isPlayPauseVisible(false);
                    areShareButtonsVisible(false);
                    isFullScreenControlVisible(false);
                    isSeekerVisible(false);
                    isLoopVisible(false);
                }
                else if (orchestrator.playerConfiguration.playerMode === rin.contracts.playerMode.AuthorerEditor) {
                    isPlayPauseVisible(false);
                    isRightContainerVisible(false);
                    isHeaderVisible(false);
                    isSeekerVisible(false);
                    isLoopVisible(false);
                }
            },
            changeTroubleShootControlsVisibilty = function (isShow) {
                if (typeof (isShow) === "boolean") {
                    areTroubleShootControlsVisible(isShow);
                    isHeaderVisible(isShow);
                }
                else if (areTroubleShootControlsVisible()) {
                    areTroubleShootControlsVisible(false);
                    isHeaderVisible(false);
                }
                else {
                    areTroubleShootControlsVisible(true);
                    isHeaderVisible(true);
                }
            },
            debugPrintCurrentTime = function () {
                if (orchestrator._rinData === null) {
                    clearInterval(debugCurrentTimeTimerId);
                }
                var currentTime = orchestrator ? orchestrator.getCurrentLogicalTimeOffset() : 0;
                var minutes = Math.floor(currentTime / 60);
                var seconds = Math.floor(currentTime % 60);
                var currentTimeString = minutes + ":" + (seconds < 10 ? "0":"") + seconds;
                debugCurrentTime(currentTimeString);
            },
            debugCurrentTimeTimerId = null,
            startInteractionMode = function () {
                orchestrator.startInteractionMode();
            },
            addMarkers = function (markers) {
                ko.utils.arrayPushAll(seekerViewModel.markers, markers);
            },
            initialize = function () {
                seekerViewModel.initialize();
                playPauseViewModel.initialize();
                loopViewModel.initialize();
                volumeControlViewModel.initialize();
                troubleShooterViewModel.initialize();
                title(orchestrator.getNarrativeInfo().title || "");
                branding(orchestrator.getNarrativeInfo().branding || "");
                description(orchestrator.getNarrativeInfo().description || "");
                setControllerOptions();
                toggleControls();
                debugCurrentTimeTimerId = setInterval(debugPrintCurrentTime, 1000);
            };

        orchestrator.isPlayerReadyChangedEvent.subscribe(onPlayerReadyChanged, null, this);
        orchestrator.playerControl.interactionModeStarted.subscribe(onInteractionModeStarted, null, this);
        orchestrator.playerControl.narrativeModeStarted.subscribe(onNarrativeModeStarted, null, this);
        orchestrator.playerControl.screenplayEnded.subscribe(onScreenplayEnded, null, this);
        orchestrator.playerStateChangedEvent.subscribe(onPlayerStateChanged, null, this);
        orchestrator.narrativeSeekedEvent.subscribe(onSeekChanged, null, this);

        return {
            initialize: initialize,

            volumeVM: volumeControlViewModel,
            seekerVM: seekerViewModel,
            playPauseVM: playPauseViewModel,
            loopVM: loopViewModel,
            troubleShooterVM: troubleShooterViewModel,
            shareLinks: shareLinks,

            showFooterControls: showFooterControls,
            showControls: showControls,
            isHeaderVisible: isHeaderVisible,
            isPlayPauseVisible: isPlayPauseVisible,
            isInteractiveControlVisible: isInteractiveControlVisible,
            isRightContainerVisible: isRightContainerVisible,
            isVolumeVisible: isVolumeVisible,
            isSeekerVisible: isSeekerVisible,
            areShareButtonsVisible: areShareButtonsVisible,
            isFullScreenControlVisible: isFullScreenControlVisible,
            areTroubleShootControlsVisible: areTroubleShootControlsVisible,
            changeTroubleShootControlsVisibilty: changeTroubleShootControlsVisibilty,
            isLoopVisible: isLoopVisible,

            isPlayerReady: isPlayerReady,
            interactionControls: interactionControls,
            title: title,
            branding: branding,
            description: description,
            debugCurrentTime: debugCurrentTime,
            startInteractionMode: startInteractionMode,
            addMarkers: addMarkers
        };
    };

    rin.internal.VolumeControllerViewModel = function (orchestrator, playerControl) {
        var isMuted = ko.observable(false),
            effectivePlayerVolumeLevelPercent = ko.observable("0%"),
            resetPlayerVolumeLevelPercent = function () {
                var effectiveVolume = 0, muteState = playerControl.mute();
                if (!muteState) {
                    effectiveVolume = Math.round(playerControl.volume() * 100);
                }
                effectivePlayerVolumeLevelPercent(effectiveVolume + "%");
                isMuted(effectiveVolume <= 0);
            },
            setVolume = function (value) {
                var volumeIsZero = (value <= 0);
                isMuted(volumeIsZero);
                playerControl.volume(value);

                // changing the volume should unmute the orchestor, but
                // we don't want to mute the orchestrator if the volume
                // is zero - that is only reflected in UI
                if (playerControl.mute() && !volumeIsZero) {
                    playerControl.mute(false);
                }

                resetPlayerVolumeLevelPercent();
            },
            setVolumeInPercent = function (value) {
                var actualValue = (value | 0) / 100;
                if (actualValue <= 0.05) {
                    actualValue = 0;
                }
                setVolume(actualValue);
            },
            setMute = function (value) {
                playerControl.mute(value);
                isMuted(value);
                resetPlayerVolumeLevelPercent();
            },
            changeMuteState = function () {
                var newValue = !isMuted();
                setMute(newValue);
                return false;
            },
            initialize = function () {
                resetPlayerVolumeLevelPercent();
            };

        isMuted(playerControl.mute());
        resetPlayerVolumeLevelPercent();
        playerControl.volumeChangedEvent.subscribe(setVolume);
        playerControl.muteChangedEvent.subscribe(setMute);

        return {
            initialize: initialize,
            hoverValue: effectivePlayerVolumeLevelPercent,
            getValue: effectivePlayerVolumeLevelPercent,
            getVolumeLevelPercent: effectivePlayerVolumeLevelPercent,
            isMuted: isMuted,
            setVolumeInPercent: setVolumeInPercent,
            setMute: setMute,
            changeMuteState: changeMuteState
        };
    };

    rin.internal.SeekerControllerViewModel = function (orchestrator, playerControl) {
        var CONST_SEEKER_UPDATE_FREQ_MS = 500,
            seekTimer = null,
            seekPosition = 0,
            isSeekEnabled = true,
            narrativeDuration = 0,
            currentTime = ko.observable("0.00"),
            seekPositionPercent = ko.observable("0%"),
            markers = ko.observableArray([]);

        // bleveque -- disable seek bar if there's a non-seekable vid
        // var vids = $('video'),
        //     vidlength = vids.length,
        //     ii;
        // for(ii=0;ii<vidlength;ii++) {
        //     if(!vids[i].seekable || vids[i].seekable.length === 0) {
        //         isSeekEnabled = false;
        //         break;
        //     }
        // }
        // end bleveque;

        var onChangeSeekerPosition = function (value, fromSetter) {
                fromSetter = fromSetter || false;
                if (isSeekEnabled && seekPosition !== value) {
                    seekPosition = value;
                    narrativeDuration = orchestrator.getNarrativeInfo().totalDuration;
                    currentTime((orchestrator.getCurrentLogicalTimeOffset() || 0).toFixed(2));
                    seekPositionPercent(Math.round(seekPosition * 100) / 100 + "%");
                    if (fromSetter) {
                        var seekToDuration = parseFloat(value) * narrativeDuration / 100,
                            playerState = orchestrator.getPlayerState();
                        if (playerState === rin.contracts.playerState.playing) {
                            playerControl.play(seekToDuration, null);
                        }
                        else {
                            playerControl.pause(seekToDuration, null);
                        }
                    }
                }
            },
            setSeekPositionPercent = function (value) {
                if (parseFloat(value) !== seekPosition) {
                    onChangeSeekerPosition(parseFloat(value), true);
                }
            },
            updateSeekPosition = function () {
                var currentOffset = orchestrator.getCurrentLogicalTimeOffset(),
                    newSeekPosition;
                narrativeDuration = orchestrator.getNarrativeInfo().totalDuration;
                newSeekPosition = narrativeDuration < 0 ? 0 : (currentOffset * 100 / narrativeDuration);
                onChangeSeekerPosition(newSeekPosition, false);
            },
            startSeekPositionUpdater = function () {
                seekTimer = setInterval(updateSeekPosition, CONST_SEEKER_UPDATE_FREQ_MS);
            },
            stopSeekPositionUpdater = function () {
                clearInterval(seekTimer);
            },
            getMarkerPosition = function (seconds) {
                narrativeDuration = orchestrator.getNarrativeInfo().totalDuration;
                return (seconds * 100 / narrativeDuration) + "%";
            },
            initialize = function () {            
                currentTime("0.00");
                setSeekPositionPercent("0");
            };

        return {
            initialize: initialize,
            isSeekEnabled: isSeekEnabled,
            hoverValue : currentTime,
            getValue: seekPositionPercent,
            markers: markers,
            getMarkerPosition: getMarkerPosition,
            getSeekPositionPercent: seekPositionPercent,
            setSeekPositionPercent: setSeekPositionPercent,
            startSeekPositionUpdater: startSeekPositionUpdater,
            stopSeekPositionUpdater: stopSeekPositionUpdater
        };
    };

    rin.internal.loopControllerViewModel = function(orchestrator, playerControl){
        var isLooped = ko.observable(false);
        this.isLooped = ko.observable(false);
        this.loopEvent = function () {
            this.isLooped = playerControl.toggleLoop();
            isLooped = this.isLooped;
            var loopButton = $(".rin_LoopOff");
            if (isLooped) {
                loopButton.css({ "opacity": "1.0" });
            } else {
                loopButton.css({ "opacity": "0.4" });
            }
        };
        this.initialize = function () {
        };
    };

    rin.internal.PlayPauseControllerViewModel = function (orchestrator,playerControl) {
        this.isPlaying = ko.observable();
        this.playPauseEvent = function () {
            var playerState = playerControl.getPlayerState();
            switch (playerState) {
                case rin.contracts.playerState.stopped:
                case rin.contracts.playerState.pausedForBuffering:
                case rin.contracts.playerState.pausedForExplore:
                    playerControl.play();
                    break;

                case rin.contracts.playerState.playing:
                    playerControl.pause();
                    break;

                default:
                    rin.internal.debug.assert(false, "onPlayPause: Unrecognized player state = " + playerState);
                    break;
            }
        };
        this.initialize = function () {
        };
    };

    rin.internal.TroubleShooterViewModel = function (orchestrator, playerControl) {
        var CONST_SEEKER_UPDATE_FREQ_MS = 500,
            self = this,
            minimumTimeInterval = ko.observable(),
            maximumTimeInterval = ko.observable(),
            selfTester = new rin.internal.SelfTester(orchestrator),
            seekTimer,
            resetControls = function () {
                self.showSelfTestDialog(false);
                self.showEditNarrativeDialog(false);
                self.showHypertimelines(false);
                self.showDeepstateDialog(false);
            },
            updateSeekPosition = function () {
                var currentOffset = orchestrator.getCurrentLogicalTimeOffset();
                self.currentTime(orchestrator.getCurrentLogicalTimeOffset());
            },
            getScreenplayIds = function (screenplays) {
                var scps = Object.keys(screenplays);
                return scps;
            };

        selfTester.logMessageEvent.subscribe(function (message) {
            self.logMessage(message);
        });

        this.interactionEvent = new rin.contracts.Event();
        this.logMessage = ko.observable("");
        this.useReload = ko.observable(false);

        this.showControls = ko.observable(true);
        this.showEditNarrativeDialog = ko.observable(false);
        this.showSelfTestDialog = ko.observable(false);
        this.showHypertimelines = ko.observable(false);
        this.selectedTimeline = ko.observable("");

        this.narrativeInfo = ko.observable(orchestrator._rinData);
        this.allScreenTimelines = ko.observableArray([]);
        this.showDeepstateDialog = ko.observable(false);
        this.capturedDeepState = ko.observable("");

        this.timeMin = ko.computed({
            read: function () {
                return minimumTimeInterval();
            },
            write: function (value) {
                if (!isNaN(value)) {
                    minimumTimeInterval(value);
                    selfTester.minimumTimeInterval = value;
                }
            }
        });
        this.timeMax = ko.computed({
            read: function () {
                return maximumTimeInterval();
            },
            write: function (value) {
                if (!isNaN(value)) {
                    maximumTimeInterval(value);
                    selfTester.maximumTimeInterval = value;
                }
            }
        });
        this.editNarrativeClick = function () {
            resetControls();
            this.showEditNarrativeDialog(true);
        };
        this.editCompleteClick = function () {
            orchestrator.load({ data: JSON.parse(this.narrativeInfo()) });
            resetControls();
        };
        this.editCancelClick = function () {
            this.narrativeInfo = ko.observable(JSON.stringify(orchestrator._rinData, null, "\t"));
            resetControls();
        };
        this.startSelfTestClick = function () {
            resetControls();
            var options = {
                deepstateReloadOption: self.useReload
            };
            selfTester.startSelfTest(options);
        };
        this.showSelfTestDialogClick = function () {
            resetControls();
            this.showSelfTestDialog(true);
        };
        this.showdeepstateDialogClick = function () {
            resetControls();
            this.showDeepstateDialog(true);
        };
        this.stopSelfTestClick = function () {
            resetControls();
            selfTester.stopSelfTest();
        };
        this.captureDeepStateClick = function () {
            var deepstateUrl = rin.internal.getDeepState(orchestrator.getDeepState(), orchestrator.playerControl.narrativeUrl);
            this.capturedDeepState(deepstateUrl);
            if (window.clipboardData) window.clipboardData.setData("Text", deepstateUrl);
        };
        this.showHypertimelineClick = function () {
            resetControls();
            this.showHypertimelines(true);
        };
        this.currentTime = ko.observable(0);
        this.totalDuration = ko.observable(0);
        this.timeControl = ko.computed({
            read: function () {
                return Math.round(self.currentTime() * 100) / 100 + "/" + Math.round(self.totalDuration() * 100) / 100;
            }
        });
        this.startSeekPositionUpdater = function () {
            seekTimer = setInterval(updateSeekPosition, CONST_SEEKER_UPDATE_FREQ_MS);
        };
        this.stopSeekPositionUpdater = function () {
            if(seekTimer)
                clearInterval(seekTimer);
        };
        selfTester.interactionEvent.subscribe(function () {
            self.interactionEvent.publish();
        });
        this.showHypertimelineClick = function () {
            resetControls();
            this.showHypertimelines(true);
        };
        this.timelineChanged = function () {
            orchestrator.play(0, this.selectedTimeline());
        };

        this.initialize = function () {
            resetControls();
            this.showControls = ko.observable(true);
            this.narrativeInfo = ko.observable(JSON.stringify(orchestrator._rinData, null, "\t"));
            this.currentTime(orchestrator.getCurrentLogicalTimeOffset());
            this.totalDuration(orchestrator && orchestrator.getNarrativeInfo() && orchestrator.getNarrativeInfo().totalDuration || 10);
            this.allScreenTimelines(getScreenplayIds(orchestrator._rinData.screenplays));
            this.selectedTimeline(orchestrator.currentScreenPlayId);
        };

        playerControl.seeked.subscribe(function () {
            self.selectedTimeline(orchestrator.currentScreenPlayId);
            self.totalDuration((orchestrator && orchestrator.getNarrativeInfo() && orchestrator.getNarrativeInfo().totalDuration) || 0);
        });
    };

    rin.internal.MailDataViewModel = function (orchestrator) {
        var newLine = "%0D%0A";
        var tabSpace = "%09";
        this.linkTitle = "Share over email";
        this.shareControlClass = "rin_MailShareButton";
        this.getDeepstate = function () {
            var deepStateUrl = rin.internal.getDeepState(orchestrator.getDeepState(), orchestrator.playerControl.narrativeUrl);
            var url = "mailto:?subject=Rich Interactive Narratives - {2}&body=Hey,{0}{1}Try this out - {1}{3}{0}".rinFormat(newLine, tabSpace, orchestrator.getNarrativeInfo().title, encodeURIComponent(deepStateUrl));
            window.open(url);
        };
    };
}(window.rin = window.rin || {}));