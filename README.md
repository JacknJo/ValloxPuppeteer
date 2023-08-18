# ValloxPuppeteer
## Scope
This component is intended to be run on a raspberry pi or similiar, to interfere with the web-app of vallox in a headless manner. The reaspberry then provides a webserver to control the webapp in a remote fashion. I use it to control my Vallox MV510 from the Loxone Miniserver without any additional hardware (except the raspberry of cause).

## Puppeteer
This is a headless test-suite for webapps, that allows interfering with the dom and user elements, without actually clicking them. Due to this technology the solution presented here is extremely fitted to this exact version of the software. Any future update to the webserver of the Vallox MV510 will most certainly break the module!

## Caveats
Setting up the headless enviornment, loading and parsing the page on the reaspberry takes some time. The page is not reloaded each time for every request, but is cached for a certain time, to ensure consecutive requests are handled correctly and only the first one takes longer (5-10 seconds - ensure you have a large timeout setting on the requesting side).

## Setup
The tool was developed with the latest version of nodejs. I honestly have no idea what the minimal supported version would be. Just download the latest nodejs from https://nodejs.org/en/download, extract it and add it's `/bin` folder to your `PATH`.

```bash
# Install the chromium browser.
sudo apt install chromium-browser chromium-codecs-ffmpeg

# Checkout the project
git clone https://JacknJo/ValloxPuppeteer
cd ValloxPuppeteer
npm install
node vallox_puppeteer_http_server.mjs <IP-OF-RASPBERRY> <PORT-ON-RASPBERRY> <IP-OR-HOSTNAME-OF-VALLOX>
```

## Add to autostart - Integration in systemd
### Update the service file
**IMPORTANT**
Currently my paths of the raspberry pi are hardcoded in the service file `vallox_puppeteer_http_server.service`. Update the file to your install locations and user on the filesystem.

### Install the service file
```bash
sudo cp vallox_puppeteer_http_server.service /etc/systemd/system
sudo systemctl daemon-reload
sudo systemctl enable vallox_puppeteer_http_server.service   # To enable on autostart
sudo systemctl start vallox_puppeteer_http_server.service    # To start directly
sudo systemctl status vallox_puppeteer_http_server.service   # To check for success
```

## API - GET requests
``` bash
# Testing
export host=192.168.199.1
export port=6000

# Returns the current mode. 0 (At-Home), 1(Away), 2(Boost), 3(Custom)
> curl -X GET $host:$port/mode
0

# Returns the current fan speed [0-100]%
> curl -X GET $host:$port/fan_speed
70%

# Returns the current target supply temperature
> curl -X GET $host:$port/target_temperature
18 °C

# Returns the current air temperatures
> curl -X GET $host:$port/air_temperature
indoor: 23 °C, outdoor: 19 °C, supply: 20 °C, exhaust: 23 °C

# Returns the current sensor values
> curl -X GET $host:$port/sensors
humidity: 67%, co2: 468ppm

# Returns all of the above, to be parsed in a single blob
> curl -X GET $host:$port/all
mode: 0
target_temperature: 15 °C
fan_speed: 70%
indoor: 23 °C, outdoor: 19 °C, supply: 20 °C, exhaust: 23 °C
humidity: 67%, co2: 467ppm

```

## API - PUT requests
``` bash
# Sets the ventilation to Away-Mode. 0 (At-Home), 1(Away), 2(Boost), 3(Custom)
> curl -X PUT $host:$port/mode/1
1

# Sets the target temperature of the currently active mode. [°C]
> curl -X PUT $host:$port/target_temperature/15
Changed target temp to 15

```
