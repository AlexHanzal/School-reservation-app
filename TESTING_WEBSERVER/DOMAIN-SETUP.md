# Local Domain Setup Guide

This guide will help you set up a custom local domain `mytest.local` for testing purposes.

## Quick Setup

1. **Run the domain setup script:**
   ```bash
   npm run setup-domain
   ```

2. **Follow the automated setup:**
   - Run the generated script as administrator
   - Windows: `setup-domain.bat`
   - Linux/Mac: `./setup-domain.sh`

3. **Start your server:**
   ```bash
   npm start
   ```

4. **Access your custom domain:**
   - http://mytest.local:3000
   - http://www.mytest.local:3000

## Manual Setup

### Windows
1. Open Command Prompt as Administrator
2. Edit hosts file: `notepad C:\Windows\System32\drivers\etc\hosts`
3. Add these lines:
   ```
   127.0.0.1    mytest.local
   127.0.0.1    www.mytest.local
   ```

### Linux/Mac
1. Open terminal
2. Edit hosts file: `sudo nano /etc/hosts`
3. Add these lines:
   ```
   127.0.0.1    mytest.local
   127.0.0.1    www.mytest.local
   ```

## Verification

1. Visit http://mytest.local:3000
2. Check the "Domain Status" section on the homepage
3. It should show "Custom Domain Active" if configured correctly

## Troubleshooting

- **Domain not resolving:** Clear DNS cache
  - Windows: `ipconfig /flushdns`
  - Mac: `sudo dscacheutil -flushcache`
  - Linux: `sudo systemctl restart systemd-resolved`

- **Permission denied:** Make sure to run setup scripts as administrator

- **Port blocked:** Check firewall settings and ensure port 3000 is open

## Customizing Your Domain

To use a different domain name:
1. Edit `local-domain-setup.js`
2. Change the `domain` property
3. Re-run the setup script
4. Update your hosts file accordingly
