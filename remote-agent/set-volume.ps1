
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume
{
    int NotImpl1();
    int NotImpl2();
    int RegisterControlChangeNotify();
    int UnregisterControlChangeNotify();
    int GetChannelCount();
    int SetMasterVolumeLevel(float level, System.Guid eventContext);
    int SetMasterVolumeLevelScalar(float level, System.Guid eventContext);
    int GetMasterVolumeLevel();
    int GetMasterVolumeLevelScalar(out float level);
    int SetChannelVolumeLevel();
    int SetChannelVolumeLevelScalar();
    int GetChannelVolumeLevel();
    int GetChannelVolumeLevelScalar();
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool isMuted, System.Guid eventContext);
    int GetMute(out bool isMuted);
    int GetVolumeStepInfo();
    int VolumeStepUp();
    int VolumeStepDown();
    int QueryHardwareSupport();
    int GetVolumeRange();
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice
{
    int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev);
}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator
{
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
}
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumeratorComObject { }
public class Audio
{
    static IAudioEndpointVolume Vol()
    {
        var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
        IMMDevice dev = null;
        enumerator.GetDefaultAudioEndpoint(0, 0, out dev);
        IAudioEndpointVolume epv = null;
        var epvid = typeof(IAudioEndpointVolume).GUID;
        dev.Activate(ref epvid, 0, 0, out epv);
        return epv;
    }
    public static float GetVolume()
    {
        float v = -1;
        Vol().GetMasterVolumeLevelScalar(out v);
        return v;
    }
    public static void SetVolume(float v)
    {
        Vol().SetMasterVolumeLevelScalar(v, System.Guid.Empty);
    }
    public static void SetMute(bool mute)
    {
        Vol().SetMute(mute, System.Guid.Empty);
    }
}
"@
[Audio]::SetVolume(0.62)
      