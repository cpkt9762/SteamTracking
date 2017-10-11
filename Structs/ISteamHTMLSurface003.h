class ISteamHTMLSurface003
{
public:
    virtual unknown_ret ~CAdapterSteamHTMLSurface003() = 0;
    virtual unknown_ret ~CAdapterSteamHTMLSurface003() = 0;
    virtual unknown_ret Init() = 0;
    virtual unknown_ret Shutdown() = 0;
    virtual unknown_ret CreateBrowser(char const*, char const*) = 0;
    virtual unknown_ret RemoveBrowser(unsigned int) = 0;
    virtual unknown_ret LoadURL(unsigned int, char const*, char const*) = 0;
    virtual unknown_ret SetSize(unsigned int, unsigned int, unsigned int) = 0;
    virtual unknown_ret StopLoad(unsigned int) = 0;
    virtual unknown_ret Reload(unsigned int) = 0;
    virtual unknown_ret GoBack(unsigned int) = 0;
    virtual unknown_ret GoForward(unsigned int) = 0;
    virtual unknown_ret AddHeader(unsigned int, char const*, char const*) = 0;
    virtual unknown_ret ExecuteJavascript(unsigned int, char const*) = 0;
    virtual unknown_ret MouseUp(unsigned int, ISteamHTMLSurface::EHTMLMouseButton) = 0;
    virtual unknown_ret MouseDown(unsigned int, ISteamHTMLSurface::EHTMLMouseButton) = 0;
    virtual unknown_ret MouseDoubleClick(unsigned int, ISteamHTMLSurface::EHTMLMouseButton) = 0;
    virtual unknown_ret MouseMove(unsigned int, int, int) = 0;
    virtual unknown_ret MouseWheel(unsigned int, int) = 0;
    virtual unknown_ret KeyDown(unsigned int, unsigned int, ISteamHTMLSurface::EHTMLKeyModifiers) = 0;
    virtual unknown_ret KeyUp(unsigned int, unsigned int, ISteamHTMLSurface::EHTMLKeyModifiers) = 0;
    virtual unknown_ret KeyChar(unsigned int, unsigned int, ISteamHTMLSurface::EHTMLKeyModifiers) = 0;
    virtual unknown_ret SetHorizontalScroll(unsigned int, unsigned int) = 0;
    virtual unknown_ret SetVerticalScroll(unsigned int, unsigned int) = 0;
    virtual unknown_ret SetKeyFocus(unsigned int, bool) = 0;
    virtual unknown_ret ViewSource(unsigned int) = 0;
    virtual unknown_ret CopyToClipboard(unsigned int) = 0;
    virtual unknown_ret PasteFromClipboard(unsigned int) = 0;
    virtual unknown_ret Find(unsigned int, char const*, bool, bool) = 0;
    virtual unknown_ret StopFind(unsigned int) = 0;
    virtual unknown_ret GetLinkAtPosition(unsigned int, int, int) = 0;
    virtual unknown_ret SetCookie(char const*, char const*, char const*, char const*, unsigned int, bool, bool) = 0;
    virtual unknown_ret SetPageScaleFactor(unsigned int, float, int, int) = 0;
    virtual unknown_ret SetBackgroundMode(unsigned int, bool) = 0;
    virtual unknown_ret AllowStartRequest(unsigned int, bool) = 0;
    virtual unknown_ret JSDialogResponse(unsigned int, bool) = 0;
    virtual unknown_ret FileLoadDialogResponse(unsigned int, char const**) = 0;
};
