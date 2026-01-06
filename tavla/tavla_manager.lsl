// ============================================
// TAVLA (BACKGAMMON) - Second Life Manager
// Oyun durumu, HTTP-In iletişimi, oyuncu yönetimi
// ============================================

// Sabitler
string WEB_URL = "https://selami79.github.io/weboyunlar/tavla/";
integer DEBUG = TRUE;

// Oyuncu bilgileri
key player1 = NULL_KEY;
key player2 = NULL_KEY;
string player1Name = "";
string player2Name = "";

// HTTP-In
key httpRequestId;
string httpInUrl = "";

// Oyun durumu
integer gameActive = FALSE;
string currentPlayer = "white"; // "white" veya "black"
list dice = [0, 0];

// Tahta durumu (24 nokta için: renk|sayı formatında)
// Index 0 = nokta 1, Index 23 = nokta 24
list board;

// Bar ve ev
integer barWhite = 0;
integer barBlack = 0;
integer homeWhite = 0;
integer homeBlack = 0;

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

debug(string msg)
{
    if (DEBUG)
    {
        llOwnerSay("🎲 [Tavla] " + msg);
    }
}

initializeBoard()
{
    board = [];
    
    // Boş tahta oluştur
    integer i;
    for (i = 0; i < 24; i++)
    {
        board += ["none|0"];
    }
    
    // Başlangıç pozisyonları (Standart backgammon)
    // Beyaz taşlar
    board = llListReplaceList(board, ["white|2"], 0, 0);   // Nokta 1
    board = llListReplaceList(board, ["white|5"], 11, 11); // Nokta 12
    board = llListReplaceList(board, ["white|3"], 16, 16); // Nokta 17
    board = llListReplaceList(board, ["white|5"], 18, 18); // Nokta 19
    
    // Siyah taşlar
    board = llListReplaceList(board, ["black|2"], 23, 23); // Nokta 24
    board = llListReplaceList(board, ["black|5"], 12, 12); // Nokta 13
    board = llListReplaceList(board, ["black|3"], 7, 7);   // Nokta 8
    board = llListReplaceList(board, ["black|5"], 5, 5);   // Nokta 6
    
    barWhite = 0;
    barBlack = 0;
    homeWhite = 0;
    homeBlack = 0;
    
    debug("Tahta başlatıldı");
}

string boardToJson()
{
    string json = "{\"board\":[";
    
    integer i;
    for (i = 0; i < 24; i++)
    {
        string point = llList2String(board, i);
        list parts = llParseString2List(point, ["|"], []);
        string color = llList2String(parts, 0);
        integer count = (integer)llList2String(parts, 1);
        
        if (i > 0) json += ",";
        json += "{\"color\":\"" + color + "\",\"count\":" + (string)count + "}";
    }
    
    json += "],";
    json += "\"bar\":{\"white\":" + (string)barWhite + ",\"black\":" + (string)barBlack + "},";
    json += "\"home\":{\"white\":" + (string)homeWhite + ",\"black\":" + (string)homeBlack + "},";
    json += "\"currentPlayer\":\"" + currentPlayer + "\",";
    json += "\"dice\":[" + (string)llList2Integer(dice, 0) + "," + (string)llList2Integer(dice, 1) + "],";
    json += "\"phase\":\"" + (gameActive ? "moving" : "waiting") + "\",";
    json += "\"players\":{";
    json += "\"white\":{\"name\":\"" + player1Name + "\",\"uuid\":\"" + (string)player1 + "\"},";
    json += "\"black\":{\"name\":\"" + player2Name + "\",\"uuid\":\"" + (string)player2 + "\"}";
    json += "}}";
    
    return json;
}

openGameUrl(key avatar, string color)
{
    string url = WEB_URL + "?lsl=" + llEscapeURL(httpInUrl) + "&uuid=" + (string)avatar + "&color=" + color;
    llLoadURL(avatar, "🎲 Tavla Oyunu - " + color + " taş", url);
    debug("URL açıldı: " + color + " için");
}

startGame()
{
    if (player1 == NULL_KEY || player2 == NULL_KEY)
    {
        llSay(0, "❌ Oyun başlatmak için iki oyuncu gerekli!");
        return;
    }
    
    initializeBoard();
    currentPlayer = "white";
    gameActive = TRUE;
    
    llSay(0, "🎲 Tavla oyunu başladı!");
    llSay(0, "⚪ Beyaz: " + player1Name);
    llSay(0, "⚫ Siyah: " + player2Name);
    
    // Her iki oyuncuya URL gönder
    openGameUrl(player1, "white");
    openGameUrl(player2, "black");
}

// ============================================
// OLAYLAR
// ============================================

default
{
    state_entry()
    {
        llSay(0, "🎲 Tavla masası hazırlanıyor...");
        
        // HTTP-In URL oluştur
        llRequestURL();
        
        // Tahtayı başlat
        initializeBoard();
        
        debug("Script başlatıldı");
    }
    
    on_rez(integer start_param)
    {
        llResetScript();
    }
    
    http_request(key id, string method, string body)
    {
        if (method == URL_REQUEST_GRANTED)
        {
            httpInUrl = body;
            llSay(0, "✅ Tavla masası hazır!");
            debug("HTTP-In URL: " + httpInUrl);
            return;
        }
        
        if (method == URL_REQUEST_DENIED)
        {
            llSay(0, "❌ HTTP-In URL alınamadı!");
            return;
        }
        
        // GET isteği - durum sorgulama
        if (method == "GET")
        {
            llHTTPResponse(id, 200, boardToJson());
            return;
        }
        
        // POST isteği - oyuncu hamlesi
        if (method == "POST")
        {
            debug("POST alındı: " + body);
            
            // JSON parse et
            string action = llJsonGetValue(body, ["action"]);
            string playerColor = llJsonGetValue(body, ["player"]);
            
            if (action == "roll")
            {
                // Zar atıldı
                integer d1 = (integer)llJsonGetValue(body, ["dice", 0]);
                integer d2 = (integer)llJsonGetValue(body, ["dice", 1]);
                dice = [d1, d2];
                
                llSay(0, "🎲 " + (playerColor == "white" ? player1Name : player2Name) + 
                      " zar attı: " + (string)d1 + " - " + (string)d2);
            }
            else if (action == "move")
            {
                // Hamle yapıldı
                integer fromPoint = (integer)llJsonGetValue(body, ["from"]);
                integer toPoint = (integer)llJsonGetValue(body, ["to"]);
                
                debug("Hamle: " + (string)fromPoint + " -> " + (string)toPoint);
                
                // TODO: Tahta durumunu güncelle
            }
            else if (action == "endTurn")
            {
                // Sıra değişti
                currentPlayer = llJsonGetValue(body, ["nextPlayer"]);
                llSay(0, "➡️ Sıra: " + (currentPlayer == "white" ? player1Name : player2Name));
            }
            else if (action == "newGame")
            {
                // Yeni oyun
                startGame();
            }
            
            llHTTPResponse(id, 200, boardToJson());
        }
    }
    
    changed(integer change)
    {
        if (change & CHANGED_LINK)
        {
            // Oturan avatarları kontrol et
            integer numPrims = llGetNumberOfPrims();
            integer i;
            
            key seated1 = NULL_KEY;
            key seated2 = NULL_KEY;
            
            for (i = 0; i <= numPrims; i++)
            {
                key av = llGetLinkKey(i);
                if (llGetAgentSize(av) != ZERO_VECTOR) // Avatar mı?
                {
                    if (seated1 == NULL_KEY)
                    {
                        seated1 = av;
                    }
                    else if (seated2 == NULL_KEY)
                    {
                        seated2 = av;
                    }
                }
            }
            
            // Oyuncu değişikliklerini kontrol et
            if (seated1 != player1)
            {
                player1 = seated1;
                if (player1 != NULL_KEY)
                {
                    player1Name = llKey2Name(player1);
                    llSay(0, "⚪ " + player1Name + " masaya oturdu (Beyaz)");
                }
            }
            
            if (seated2 != player2)
            {
                player2 = seated2;
                if (player2 != NULL_KEY)
                {
                    player2Name = llKey2Name(player2);
                    llSay(0, "⚫ " + player2Name + " masaya oturdu (Siyah)");
                }
            }
            
            // İki oyuncu da oturduğunda bilgilendir
            if (player1 != NULL_KEY && player2 != NULL_KEY && !gameActive)
            {
                llSay(0, "✅ İki oyuncu hazır! Oyunu başlatmak için masaya tıklayın.");
            }
        }
    }
    
    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        
        // Menü göster
        list buttons = [];
        
        if (player1 != NULL_KEY && player2 != NULL_KEY)
        {
            buttons += ["🎮 Başlat"];
        }
        
        buttons += ["📊 Durum", "🔄 Sıfırla"];
        
        if (toucher == player1 || toucher == player2)
        {
            buttons += ["🌐 Web Aç"];
        }
        
        llDialog(toucher, "🎲 TAVLA\n\nBeyaz: " + (player1Name != "" ? player1Name : "(boş)") +
                 "\nSiyah: " + (player2Name != "" ? player2Name : "(boş)") +
                 "\n\nSeçim yapın:", buttons, -999);
    }
    
    listen(integer channel, string name, key id, string message)
    {
        if (channel != -999) return;
        
        if (message == "🎮 Başlat")
        {
            startGame();
        }
        else if (message == "📊 Durum")
        {
            llSay(0, "📊 Oyun Durumu:");
            llSay(0, "Beyaz: " + player1Name + " (Ev: " + (string)homeWhite + ")");
            llSay(0, "Siyah: " + player2Name + " (Ev: " + (string)homeBlack + ")");
            llSay(0, "Sıra: " + (currentPlayer == "white" ? player1Name : player2Name));
        }
        else if (message == "🔄 Sıfırla")
        {
            gameActive = FALSE;
            initializeBoard();
            llSay(0, "🔄 Oyun sıfırlandı");
        }
        else if (message == "🌐 Web Aç")
        {
            if (id == player1)
            {
                openGameUrl(player1, "white");
            }
            else if (id == player2)
            {
                openGameUrl(player2, "black");
            }
        }
    }
    
    state_exit()
    {
        if (httpInUrl != "")
        {
            llReleaseURL(httpInUrl);
        }
    }
}
