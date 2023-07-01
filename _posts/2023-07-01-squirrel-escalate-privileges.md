---
title: "Using Squirrel Framework to escalate privileges"
categories:
tags:
  - squirrel-framwork
---

The ![Squirrel framework](https://github.com/Squirrel/Squirrel.Windows) can be used to trick the user and escalate privileges.

In this example we will check Discord, which uses Squirrel for updating.

By checking out the Desktop shortcut that is created during installation, we can see an interesting argument passed to the Update.exe

<div style="text-align: center">
    ![Shortcut Properties Window](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2FiJLHQNak3q7BAm6FeVrJ%2Fimage.png?alt=media&token=18840807-3d35-4a5c-9e1c-39d341d31ef2)
</div>

The argument "--processStart" as per the documentation "Start an executable in the latest version of the app package".

So what if we place a payload in the app directory, change the shortcut an run it?

<div style="text-align: center">
![](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2FLJkoTumaUAFTM734DdXH%2Fimage.png?alt=media&token=c60d0413-5e33-456b-ad81-00675e5f4d53)
</div>

Our payload runs!

<div style="text-align: center">
![](https://files.gitbook.com/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F1LVNvGPGQCnGZ6XXnRnz%2Fuploads%2F6hcO8GNGP30qPD8F74kC%2Fimage.png?alt=media&token=7e8977d6-a96a-4c29-ab31-47ecf46e167d)
</div>

So to create our little POC we need a few things:
1. Find the latest version of the app package.
2. Place our payload on the latest app package directory.
3. Change the Shortcut to lunch our payload instead of the discord binary.