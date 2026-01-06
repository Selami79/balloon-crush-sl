// BALLOON CRUSH - Second Life Integration Script v3
// Level progress and high scores saved in LSL

string GAME_BASE_URL = "https://selami79.github.io/balloon-crush-sl/"; 
string STANDBY_TEXTURE = "d570bdfe-69a5-e500-bf13-31e36c093634";
string my_url = "";
integer SCREEN_LINK = -2; 
integer RESET_PRIM_LINK = -1; 
integer SCREEN_FACE = 0;
integer hasPlayer = FALSE;
integer MAX_SCORES = 10;
list highScores = []; 
list playerLevels = [];

FindPrims() {
    integer i;
    integer prims = llGetNumberOfPrims();
    SCREEN_LINK = -2; 
    RESET_PRIM_LINK = -1;
    
    if (prims == 1) {
        string rootName = llStringTrim(llToLower(llGetLinkName(LINK_THIS)), STRING_TRIM);
        if (rootName == "ekran" || rootName == "") {
            SCREEN_LINK = LINK_THIS;
        }
    } else {
        for(i=0; i<=prims; ++i) {
            string n = llStringTrim(llToLower(llGetLinkName(i)), STRING_TRIM);
            if(n == "ekran") SCREEN_LINK = i;
            else if(n == "reset") RESET_PRIM_LINK = i;
        }
    }
    
    if (SCREEN_LINK == -2) {
        SCREEN_LINK = LINK_THIS;
    }
}

integer GetPlayerLevel(string playerName) {
    integer idx = llListFindList(playerLevels, [playerName]);
    if (idx != -1) {
        return llList2Integer(playerLevels, idx + 1);
    }
    return 1;
}

SetPlayerLevel(string playerName, integer level) {
    integer idx = llListFindList(playerLevels, [playerName]);
    if (idx != -1) {
        playerLevels = llListReplaceList(playerLevels, [playerName, level], idx, idx + 1);
    } else {
        playerLevels += [playerName, level];
    }
}

DisplayHighScores() {
    string text = "🎈 BALLOON CRUSH 🎈\n🏆 TOP 10 🏆\n\n";
    integer len = llGetListLength(highScores);
    integer i;
    for(i=0; i<len; i+=2) {
        text += (string)((i/2)+1) + ". " + llList2String(highScores, i+1) + " - " + llList2String(highScores, i) + "\n";
    }
    if(RESET_PRIM_LINK != -1) llSetLinkPrimitiveParamsFast(RESET_PRIM_LINK, [PRIM_TEXT, text, <0,1,1>, 1.0]);
}

SetStandby() {
    hasPlayer = FALSE;
    llSetTimerEvent(0.0);
    if (SCREEN_LINK >= 0) {
        llClearLinkMedia(SCREEN_LINK, SCREEN_FACE);
        llSetLinkPrimitiveParamsFast(SCREEN_LINK, [PRIM_TEXTURE, SCREEN_FACE, STANDBY_TEXTURE, <1,1,0>, <0,0,0>, 0.0]);
    }
}

default {
    state_entry() {
        FindPrims();
        llRequestSecureURL();
        SetStandby();
        llOwnerSay("Balloon Crush Ready.");
    }

    http_request(key id, string method, string body) {
        if (method == URL_REQUEST_GRANTED) {
            my_url = body;
        } else if (method == "POST" || method == "GET") {
            string jsonData = body;
            if (method == "GET") {
                string query = llGetHTTPHeader(id, "x-query-string");
                integer dataStart = llSubStringIndex(query, "data=");
                if (dataStart != -1) {
                    jsonData = llUnescapeURL(llGetSubString(query, dataStart + 5, -1));
                    integer ampPos = llSubStringIndex(jsonData, "&");
                    if (ampPos != -1) {
                        jsonData = llGetSubString(jsonData, 0, ampPos - 1);
                    }
                }
            }
            
            string name = llJsonGetValue(jsonData, ["name"]);
            integer newScore = (integer)llJsonGetValue(jsonData, ["score"]);
            integer newLevel = (integer)llJsonGetValue(jsonData, ["level"]);
            
            // Reset timeout on any activity
            if (hasPlayer) {
                llSetTimerEvent(60.0);
            }
            
            if(name != JSON_INVALID && name != "") {
                // Update player level
                if (newLevel > 0) {
                    integer currentLevel = GetPlayerLevel(name);
                    if (newLevel > currentLevel) {
                        SetPlayerLevel(name, newLevel);
                    }
                }
                
                // Update high scores when game over
                if (newScore > 0) {
                    integer found = -1;
                    integer i;
                    integer len = llGetListLength(highScores);
                    for (i = 1; i < len; i += 2) {
                        if (llList2String(highScores, i) == name) {
                            found = i;
                        }
                    }
                    
                    if (found != -1) {
                        integer oldScore = llList2Integer(highScores, found - 1);
                        if (newScore > oldScore) {
                            highScores = llDeleteSubList(highScores, found - 1, found);
                            highScores += [newScore, name];
                        }
                    } else {
                        highScores += [newScore, name];
                    }
                    
                    highScores = llListSort(highScores, 2, FALSE);
                    if(llGetListLength(highScores) > MAX_SCORES * 2) {
                        highScores = llList2List(highScores, 0, (MAX_SCORES * 2) - 1);
                    }
                    DisplayHighScores();
                    
                    llHTTPResponse(id, 200, "GAMEOVER");
                    llSleep(3.0);
                    SetStandby();
                } else {
                    llHTTPResponse(id, 200, "OK");
                }
            } else {
                llHTTPResponse(id, 200, "OK");
            }
        }
    }

    touch_start(integer n) {
        integer link = llDetectedLinkNumber(0);
        string name = llToLower(llGetLinkName(link));
        if (name == "reset") llResetScript();
        else if (link == SCREEN_LINK && !hasPlayer) {
            string user = llDetectedName(0);
            hasPlayer = TRUE;
            
            integer playerLevel = GetPlayerLevel(user);
            
            string url = GAME_BASE_URL + "?player=" + llEscapeURL(user) 
                + "&sl_url=" + llEscapeURL(my_url) 
                + "&level=" + (string)playerLevel
                + "&v=" + (string)llGetUnixTime();
            
            llSetLinkMedia(SCREEN_LINK, SCREEN_FACE, [
                PRIM_MEDIA_CURRENT_URL, url,
                PRIM_MEDIA_HOME_URL, url,
                PRIM_MEDIA_AUTO_PLAY, TRUE,
                PRIM_MEDIA_FIRST_CLICK_INTERACT, FALSE,
                PRIM_MEDIA_PERMS_CONTROL, PRIM_MEDIA_PERM_NONE,
                PRIM_MEDIA_PERMS_INTERACT, PRIM_MEDIA_PERM_ANYONE,
                PRIM_MEDIA_AUTO_SCALE, TRUE,
                PRIM_MEDIA_AUTO_ZOOM, TRUE
            ]);
            llSetTimerEvent(60.0);
        }
    }
    
    timer() {
        if (hasPlayer) {
            SetStandby();
        }
    }
    
    on_rez(integer p) { llResetScript(); }
    changed(integer c) { if(c & CHANGED_REGION) llResetScript(); }
}
