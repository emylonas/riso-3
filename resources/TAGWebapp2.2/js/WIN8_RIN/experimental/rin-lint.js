;
;
;
;
;
;
;
;
;
var rin;
(function (rin) {
    (function (experimental) {
        (function (validator) {
            function getJSONFile(url, getAll) {
                var jsonData;
                window["$"].ajax({
                    type: "GET",
                    url: url,
                    async: false,
                    cache: true,
                    error: function (jqxhr, textStatus, errorThrown) {
                        console.log(errorThrown);
                    },
                    success: function (data, textStatus, jqxhr) {
                        try  {
                            jsonData = JSON.parse(data);
                            if(!getAll) {
                                jsonData = jsonData[0];
                            }
                        } catch (e) {
                            console.error(url + " is not a valid json file");
                        }
                    }
                });
                return jsonData;
            }
            function deepCompare(object1, object2) {
                if(typeof object1 === "object" && typeof object2 === "object") {
                    for(var prop in object2) {
                        return deepCompare(object1[prop], object2[prop]);
                    }
                } else {
                    return object1 === object2;
                }
            }
            (function (lintOutputType) {
                lintOutputType._map = [];
                lintOutputType._map[0] = "VALID";
                lintOutputType.VALID = 0;
                lintOutputType._map[1] = "ERROR";
                lintOutputType.ERROR = 1;
                lintOutputType._map[2] = "WARNING";
                lintOutputType.WARNING = 2;
            })(validator.lintOutputType || (validator.lintOutputType = {}));
            var lintOutputType = validator.lintOutputType;
            var LintOutput = (function () {
                function LintOutput(validationType, id, type, message) {
                    this.validationType = validationType;
                    this.id = id;
                    this.type = type;
                    this.message = message;
                }
                return LintOutput;
            })();
            validator.LintOutput = LintOutput;            
            var LintOutputCollection = (function () {
                function LintOutputCollection() {
                    this.source = {
                    };
                }
                LintOutputCollection.prototype.add = function (itemToAdd) {
                    if(itemToAdd) {
                        this.source[itemToAdd.validationType + "-" + itemToAdd.id] = itemToAdd;
                    }
                    return this;
                };
                LintOutputCollection.prototype.addMany = function (itemsToAdd) {
                    if(itemsToAdd) {
                        for(var item in itemsToAdd.source) {
                            this.add(itemsToAdd.source[item]);
                        }
                    }
                    return this;
                };
                return LintOutputCollection;
            })();
            validator.LintOutputCollection = LintOutputCollection;            
            //Validators
            /*************************************************************************************************************************************/
            function checkIfResourceIdValid(narrative, resourceId) {
                if(narrative && narrative.resources && narrative.resources[resourceId]) {
                    return new LintOutput("1", resourceId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("1", resourceId, lintOutputType.ERROR, resourceId + " missing in the narrative");
            }
            function checkIfResourceDataValid(narrative, resourceId, resourceData) {
                if(narrative && narrative.resources && narrative.resources[resourceId] && deepCompare(narrative.resources[resourceId], resourceData)) {
                    return new LintOutput("2", resourceId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("2", resourceId, lintOutputType.ERROR, resourceId + " data missing/mismatched in the narrative");
            }
            function checkIfExperienceIdValid(narrative, experienceId) {
                if(narrative && narrative.experiences && narrative.experiences[experienceId]) {
                    return new LintOutput("3", experienceId + "-id", lintOutputType.VALID, "Valid");
                }
                return new LintOutput("3", experienceId, lintOutputType.ERROR, experienceId + " missing in the narrative");
            }
            function checkIfExperienceStreamIdValid(narrative, experienceId, experienceStreamId) {
                if(narrative && narrative.experiences && narrative.experiences[experienceId] && narrative.experiences[experienceId].experienceStreams && narrative.experiences[experienceId].experienceStreams[experienceStreamId]) {
                    return new LintOutput("4", experienceId + "-" + experienceStreamId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("4", experienceId + "-" + experienceStreamId, lintOutputType.ERROR, experienceStreamId + " missing in the narrative under " + experienceId);
            }
            function checkIfKeyframeValid(narrative, experienceId, experienceStreamId, keyframe) {
                if(narrative && narrative.experiences && narrative.experiences[experienceId] && narrative.experiences[experienceId].experienceStreams && narrative.experiences[experienceId].experienceStreams[experienceStreamId] && narrative.experiences[experienceId].experienceStreams[experienceStreamId].keyframes) {
                    var keyframes = narrative.experiences[experienceId].experienceStreams[experienceStreamId].keyframes;
                    var keyframeLength = keyframes.length;
                    for(var index = 0; index < keyframeLength; index++) {
                        if(deepCompare(keyframes[index], keyframe)) {
                            return new LintOutput("5", experienceId + "-" + experienceStreamId, lintOutputType.VALID, "Valid");
                        }
                    }
                }
                return new LintOutput("5", experienceId + "-" + experienceStreamId, lintOutputType.ERROR, "ExperienceId: " + experienceId + ", ExperienceStreamId:" + experienceStreamId + " keyframe data missing/mismatched in the narrative");
            }
            function checkIfScreenplayIdValid(narrative, screenplayId) {
                if(narrative && narrative.screenplays && narrative.screenplays[screenplayId]) {
                    return new LintOutput("6", screenplayId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("6", screenplayId, lintOutputType.ERROR, screenplayId + " missing in the narrative");
            }
            function checkIfScreenplayDataValid(narrative, screenplayId, screenplayData) {
                if(narrative && narrative.screenplays && narrative.screenplays[screenplayId] && deepCompare(narrative.screenplays[screenplayId], screenplayData)) {
                    return new LintOutput("7", screenplayId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("7", screenplayId, lintOutputType.ERROR, screenplayId + " data missing/mismatched in the narrative");
            }
            function checkIfScreenplayPropertyExists(screenplay, screenplayId) {
                if(screenplay && screenplay[screenplayId]) {
                    return new LintOutput("8", screenplayId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("8", screenplayId, lintOutputType.ERROR, screenplayId + " missing in screenplay properties");
            }
            function checkIfScreenplayPropertyDataValid(screenplay, screenplayId, data) {
                if(screenplay && screenplay[screenplayId] && deepCompare(screenplay[screenplayId], data)) {
                    return new LintOutput("9", screenplayId, lintOutputType.VALID, "Valid");
                }
                return new LintOutput("9", screenplayId, lintOutputType.ERROR, screenplayId + " missing/mismatched in screenplay properties");
            }
            function checkIfEADataExists(eaData, id, data) {
                if(eaData) {
                    for(var ea in eaData) {
                        if(eaData.hasOwnProperty(ea)) {
                            if(deepCompare(eaData[ea], data)) {
                                return new LintOutput("10", id, lintOutputType.VALID, "Valid");
                            }
                        }
                    }
                }
                return new LintOutput("10", id, lintOutputType.ERROR, id + " missing/mismatched in ea");
            }
            ;
            /*************************************************************************************************************************************/
            // Fill in the data by actually querying the required narrative files.
            function fetchAllJSONData(filesToFetch) {
                var fetchedData = {
                };
                for(var file in filesToFetch) {
                    fetchedData[file] = getJSONFile(filesToFetch[file]);
                }
                return fetchedData;
            }
            validator.fetchAllJSONData = fetchAllJSONData;
            // Compute all the ids, file names, etc required for an xx-to-yy transition.
            function genXXtoYYIds(xx, yy) {
                var data = {
                    xx: xx,
                    xxRId: "R-pano-" + xx,
                    xxREASId: "R-EAs-" + xx,
                    xxREAUri: xx + "/EAs.js",
                    xxRAudioId: "R-audio-" + xx + "-narration",
                    xxREAResource: {
                        uriReference: xx + "/EAs.js"
                    },
                    xxEId: "E-pano-" + xx,
                    xxExperience: {
                        "providerId": "MicrosoftResearch.Rin.PanoramicExperienceStream",
                        "data": {
                            "EmbeddedArtifacts": {
                                "datasource": "R-EAs-" + xx,
                                "artifactHost": "rin.embeddedArtifacts.ArtifactHost",
                                "artifactType": "Artifacts",
                                "hideDuringPlay": true,
                                "policies": [
                                    "base2DGroupPolicy"
                                ]
                            }
                        },
                        "resourceReferences": [
                            {
                                "resourceId": "R-pano-" + xx,
                                "required": true
                            }
                        ],
                        "experienceStreams": {
                            "ES-main": {
                                "duration": 0.5
                            }
                        }
                    },
                    xxMainHTId: "S-" + xx + "-main",
                    xxMainHT: {
                        data: {
                            experienceStreamReferences: [
                                {
                                    "experienceId": "E-pano-" + xx,
                                    "experienceStreamId": "ES-main",
                                    "begin": 0,
                                    "duration": 0.5,
                                    "layer": "foreground",
                                    "dominantMedia": "visual",
                                    "volume": 0.6
                                }, 
                                {
                                    "experienceId": "E-audio-background-music-01",
                                    "experienceStreamId": "defaultStream",
                                    "begin": 0,
                                    "duration": 0.5,
                                    "layer": "foreground",
                                    "dominantMedia": "audio"
                                }
                            ]
                        }
                    },
                    xxMainHTEndAction: {
                        id: "S-" + xx + "-main",
                        includes: null,
                        endActionUrl: {
                            id: "endActionUrl",
                            endActionUrlProperty: {
                                endActionUrl: "http://default/?screenPlayId=S-" + xx + "-main&seekTime=0&action=pause",
                                beforeEndAction: "pause"
                            }
                        }
                    },
                    xxOverlayESId: "ES-" + xx + "-title",
                    xxOverlayESKeyframe: {
                        offset: 0,
                        holdDuration: 0.2,
                        data: {
                            "ea-selstate": {
                                item: {
                                }
                            }
                        }
                    },
                    mainESId: "ES-main",
                    yy: yy,
                    yyRId: "R-pano-" + yy,
                    yyREASId: "R-EAs-" + yy,
                    yyRAudioId: "R-audio-" + yy + "-narration",
                    yyREAUri: yy + "/EAs.js",
                    yyREAResource: {
                        uriReference: yy + "/EAs.js"
                    },
                    yyEId: "E-pano-" + yy,
                    yyExperience: {
                        "providerId": "MicrosoftResearch.Rin.PanoramicExperienceStream",
                        "data": {
                            "EmbeddedArtifacts": {
                                "datasource": "R-EAs-" + yy,
                                "artifactHost": "rin.embeddedArtifacts.ArtifactHost",
                                "artifactType": "Artifacts",
                                "hideDuringPlay": true,
                                "policies": [
                                    "base2DGroupPolicy"
                                ]
                            }
                        },
                        "resourceReferences": [
                            {
                                "resourceId": "R-pano-" + yy,
                                "required": true
                            }
                        ],
                        "experienceStreams": {
                            "ES-main": {
                                "duration": 0.5
                            }
                        }
                    },
                    yyMainHTId: "S-" + yy + "-main",
                    yyMainHT: {
                        data: {
                            experienceStreamReferences: [
                                {
                                    "experienceId": "E-pano-" + yy,
                                    "experienceStreamId": "ES-main",
                                    "begin": 0,
                                    "duration": 0.5,
                                    "layer": "foreground",
                                    "dominantMedia": "visual",
                                    "volume": 0.6
                                }, 
                                {
                                    "experienceId": "E-audio-background-music-01",
                                    "experienceStreamId": "defaultStream",
                                    "begin": 0,
                                    "duration": 0.5,
                                    "layer": "foreground",
                                    "dominantMedia": "audio"
                                }
                            ]
                        }
                    },
                    yyMainHTEndAction: {
                        id: "S-" + yy + "-main",
                        includes: null,
                        endActionUrl: {
                            id: "endActionUrl",
                            endActionUrlProperty: {
                                endActionUrl: "http://default/?screenPlayId=S-" + yy + "-main&seekTime=0&action=pause",
                                beforeEndAction: "pause"
                            }
                        }
                    },
                    yyOverlayESId: "ES-" + yy + "-title",
                    yyOverlayESKeyframe: {
                        offset: 0,
                        holdDuration: 0.2,
                        data: {
                            "ea-selstate": {
                                item: {
                                    itemid: ""
                                }
                            }
                        }
                    },
                    xxyyHTId: "S-" + xx + "-to-" + yy,
                    xxyyESId: "ES-to-" + yy,
                    xxyyHT: {
                        "data": {
                            "experienceStreamReferences": [
                                {
                                    "experienceId": "E-pano-" + xx,
                                    "experienceStreamId": "ES-to-" + yy,
                                    "begin": 0,
                                    "duration": 3,
                                    "layer": "foreground",
                                    "dominantMedia": "visual"
                                }, 
                                {
                                    "experienceId": "E-pano-" + yy,
                                    "experienceStreamId": "ES-entry",
                                    "begin": 3,
                                    "duration": 2.5,
                                    "layer": "foreground",
                                    "dominantMedia": "visual"
                                }, 
                                {
                                    "experienceId": "E-audio-background-music-01",
                                    "experienceStreamId": "defaultStream",
                                    "begin": 0,
                                    "duration": 5.0,
                                    "layer": "foreground",
                                    "dominantMedia": "audio"
                                }
                            ]
                        }
                    },
                    xxyyHTEndAction: {
                        "id": "S-" + xx + "-to-" + yy,
                        "includes": null,
                        "isTransitionScreenPlay": true,
                        "endActionUrl": {
                            "id": "endActionUrl",
                            "endActionUrlProperty": {
                                "endActionUrl": "http://default/?screenPlayId=S-" + yy + "-main&seekTime=0&action=pause"
                            }
                        }
                    },
                    yyxxHTId: "S-" + yy + "-to-" + xx,
                    yyxxHT: {
                        "data": {
                            "experienceStreamReferences": [
                                {
                                    "experienceId": "E-pano-" + yy,
                                    "experienceStreamId": "ES-to-" + xx,
                                    "begin": 0,
                                    "duration": 3,
                                    "layer": "foreground",
                                    "dominantMedia": "visual"
                                }, 
                                {
                                    "experienceId": "E-pano-" + xx,
                                    "experienceStreamId": "ES-entry",
                                    "begin": 3,
                                    "duration": 2.5,
                                    "layer": "foreground",
                                    "dominantMedia": "visual"
                                }, 
                                {
                                    "experienceId": "E-audio-background-music-01",
                                    "experienceStreamId": "defaultStream",
                                    "begin": 0,
                                    "duration": 5.0,
                                    "layer": "foreground",
                                    "dominantMedia": "audio"
                                }
                            ]
                        }
                    },
                    yyxxHTEndAction: {
                        "id": "S-" + yy + "-to-" + xx,
                        "includes": null,
                        "isTransitionScreenPlay": true,
                        "endActionUrl": {
                            "id": "endActionUrl",
                            "endActionUrlProperty": {
                                "endActionUrl": "http://default/?screenPlayId=S-" + xx + "-main&seekTime=0&action=pause"
                            }
                        }
                    },
                    yyxxESId: "ES-to-" + xx,
                    toxxEAId: "EA-" + xx,
                    toxxEAData: {
                        "region": {
                        },
                        "eaTypeId": "rin.embeddedArtifacts.Label",
                        "backgroundColor": "blue",
                        "linkType": "secondaryLink",
                        "defaultInteractionBehavior": "rin.interactionBehaviors.seekToHT",
                        "url": "http://default/?screenPlayId=S-" + xx + "-to-" + yy + "&begin=0.0&action=play&transition=adaptive"
                    },
                    toyyEAId: "EA-" + yy,
                    toyyEAData: {
                        "region": {
                        },
                        "eaTypeId": "rin.embeddedArtifacts.Label",
                        "zoomRange": {
                        },
                        "backgroundColor": "blue",
                        "linkType": "secondaryLink",
                        "defaultInteractionBehavior": "rin.interactionBehaviors.seekToHT",
                        "url": "http://default/?screenPlayId=S-" + yy + "-to-" + xx + "&begin=0.0&action=play&transition=adaptive"
                    },
                    xxNextEA: "next",
                    yyBackEA: "back"
                };
                return data;
            }
            validator.genXXtoYYIds = genXXtoYYIds;
            // Validate the data...
            function validateXXtoYYData(expectedData, actual, xxIsPrimary, yyIsPrimary, urlPrefix) {
                var narrativeData = actual["narrative"];
                var screenplayData = actual["screenplay"];
                var output = new LintOutputCollection();
                var xxEAFilePath = expectedData.xxREAUri;
                var yyEAFilePath = expectedData.yyREAUri;
                if(!window["rin"].util.isAbsoluteUrl(xxEAFilePath)) {
                    xxEAFilePath = window["rin"].util.combinePathElements(urlPrefix, xxEAFilePath);
                }
                if(!window["rin"].util.isAbsoluteUrl(yyEAFilePath)) {
                    yyEAFilePath = window["rin"].util.combinePathElements(urlPrefix, yyEAFilePath);
                }
                var xxEAFile = getJSONFile(xxEAFilePath, true);
                var yyEAFile = getJSONFile(yyEAFilePath, true);
                if(!narrativeData && !screenplayData) {
                    return null;//All failed
                    
                }
                output.add(checkIfResourceIdValid(narrativeData, expectedData.xxRId)).add(checkIfResourceIdValid(narrativeData, expectedData.xxREASId)).add(checkIfResourceIdValid(narrativeData, expectedData.xxRAudioId)).add(checkIfResourceDataValid(narrativeData, expectedData.xxREASId, expectedData.xxREAResource)).add(checkIfExperienceIdValid(narrativeData, "ES-OVERLAYS")).add(checkIfExperienceStreamIdValid(narrativeData, "ES-OVERLAYS", expectedData.xxOverlayESId)).add(checkIfKeyframeValid(narrativeData, "ES-OVERLAYS", expectedData.xxOverlayESId, expectedData.xxOverlayESKeyframe)).add(checkIfExperienceIdValid(narrativeData, expectedData.xxEId)).add(checkIfScreenplayIdValid(narrativeData, expectedData.xxMainHTId)).add(checkIfScreenplayDataValid(narrativeData, expectedData.xxMainHTId, expectedData.xxMainHT)).add(checkIfScreenplayPropertyExists(screenplayData, expectedData.xxMainHTId)).add(checkIfResourceIdValid(narrativeData, expectedData.yyRId)).add(checkIfResourceIdValid(narrativeData, expectedData.yyREASId)).add(checkIfResourceIdValid(narrativeData, expectedData.yyRAudioId)).add(checkIfResourceDataValid(narrativeData, expectedData.yyREASId, expectedData.yyREAResource)).add(checkIfExperienceIdValid(narrativeData, "ES-OVERLAYS")).add(checkIfExperienceStreamIdValid(narrativeData, "ES-OVERLAYS", expectedData.yyOverlayESId)).add(checkIfKeyframeValid(narrativeData, "ES-OVERLAYS", expectedData.yyOverlayESId, expectedData.yyOverlayESKeyframe)).add(checkIfExperienceIdValid(narrativeData, expectedData.yyEId)).add(checkIfScreenplayIdValid(narrativeData, expectedData.yyMainHTId)).add(checkIfScreenplayDataValid(narrativeData, expectedData.yyMainHTId, expectedData.yyMainHT)).add(checkIfScreenplayPropertyExists(screenplayData, expectedData.yyMainHTId));
                output.add(checkIfExperienceStreamIdValid(narrativeData, expectedData.yyEId, expectedData.yyxxESId));
                output.add(checkIfScreenplayIdValid(narrativeData, expectedData.yyxxHTId));
                output.add(checkIfScreenplayDataValid(narrativeData, expectedData.yyxxHTId, expectedData.yyxxHT));
                output.add(checkIfScreenplayPropertyExists(screenplayData, expectedData.yyxxHTId));
                output.add(checkIfScreenplayPropertyDataValid(screenplayData, expectedData.yyxxHTId, expectedData.yyxxHTEndAction));
                output.add(checkIfExperienceStreamIdValid(narrativeData, expectedData.xxEId, expectedData.xxyyESId));
                output.add(checkIfScreenplayIdValid(narrativeData, expectedData.xxyyHTId));
                output.add(checkIfScreenplayDataValid(narrativeData, expectedData.xxyyHTId, expectedData.xxyyHT));
                output.add(checkIfScreenplayPropertyExists(screenplayData, expectedData.xxyyHTId));
                output.add(checkIfScreenplayPropertyDataValid(screenplayData, expectedData.xxyyHTId, expectedData.xxyyHTEndAction));
                if(xxIsPrimary) {
                    output.add(checkIfScreenplayPropertyDataValid(screenplayData, expectedData.xxMainHTId, expectedData.xxMainHTEndAction));
                } else {
                    output.add(checkIfEADataExists(yyEAFile, expectedData.toxxEAId, expectedData.toxxEAData));
                }
                if(yyIsPrimary) {
                    output.add(checkIfScreenplayPropertyDataValid(screenplayData, expectedData.yyMainHTId, expectedData.yyMainHTEndAction));
                } else {
                    output.add(checkIfEADataExists(xxEAFile, expectedData.toyyEAId, expectedData.toyyEAData));
                }
                return output;
            }
            validator.validateXXtoYYData = validateXXtoYYData;
        })(experimental.validator || (experimental.validator = {}));
        var validator = experimental.validator;
    })(rin.experimental || (rin.experimental = {}));
    var experimental = rin.experimental;
})(rin || (rin = {}));
//var xxyyDataExpected = rin.experimental.validator.genXXtoYYIds("03_EA_Nam", "03A_EA_NamBaz");
//var dataActual = rin.experimental.validator.fetchAllJSONData({
//    "screenplay": "common/screenplayproperties.js",
//    "narrative": "narrative.js"
//});
//rin.experimental.validator.validateXXtoYYData(xxyyDataExpected, dataActual, true, false);
//@ sourceMappingURL=rin-lint.js.map
