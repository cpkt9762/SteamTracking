class IClientStreamLauncher
{
public:
    virtual unknown_ret StartStreaming(char const*) = 0;
    virtual unknown_ret StopStreaming() = 0;
};
