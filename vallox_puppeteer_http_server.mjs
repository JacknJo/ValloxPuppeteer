#!/usr/bin/env node
import puppeteer from 'puppeteer';
import http from 'http'


// Setup globals.
const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium-browser",
  userDataDir: "/tmp/puppeteer_profile",
  headless: true
});

const page = await browser.newPage();

let last_reload = Date.now();

function reload_necessary() {
  const delta = Date.now() - last_reload;
  if (delta > 30 * 1000) {
    last_reload = Date.now();
    console.log("Reload necessary!")
    return true;
  }
  return false;
}

async function timeit(callable) {
  let start = Date.now();
  let ret = await callable();
  const delta = Date.now() - start;
  console.log("Took " + delta + " ms to process request.");
  return ret;
}

// Define a sleep function that returns a promise
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reload_if_necessary() {
  if (reload_necessary()) {
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(1000);
  }
}

async function get_active_mode(page) {
  await reload_if_necessary();
  const [currentMode] = await page.$x('//div[contains(@class, "dashboard-profile-radio-fan") and contains(@class, "dashboard-profile-radioactive")]');
  const dashboard_id = await currentMode.evaluate(el => el.getAttribute("dashboard"))

  return dashboard_id;
}

async function set_active_mode(page, mode) {
  const [selectedModeButton] = await page.$x('//div[contains(@class, "dashboard-left")]/div[contains(@id, "profileradios")]/div[contains(@class, "dashboard-io-button") and contains(@dashboard, "' + mode + '")]')
  await selectedModeButton.click();
  const [applySelectionElement] = await page.$x('//div[contains(@item-path, "dashboard.profile.list.' + mode + '.activate")]//a');
  await applySelectionElement.click();
  return '' + mode;
}

async function get_sensors(page) {
  await reload_if_necessary();
  const [humidityElement] = await page.$x('//div[contains(@class, "dashboard-align-right")]/div[contains(@class, "dashboard-view-viewer") and contains(@l10n-path, "info.details.rh.sensors.0")]/p');
  const humidity = await humidityElement.evaluate(el => el.textContent)
  const [co2Element] = await page.$x('//div[contains(@class, "dashboard-align-right")]/div[contains(@class, "dashboard-view-viewer") and contains(@l10n-path, "info.details.co2.sensors.0")]/p');
  const co2 = await co2Element.evaluate(el => el.textContent)
  return 'humidity: ' + humidity + ', co2: ' + co2;
}

async function get_fan_speed(page) {
  await reload_if_necessary();
  const [fanSpeedElement] = await page.$x('//div[contains(@class, "dashboard-align-right")]/div[contains(@class, "dashboard-view-viewer") and contains(@l10n-path, "dashboard.profile.fanspeed")]/p');
  const fanSpeed = await fanSpeedElement.evaluate(el => el.textContent);
  return fanSpeed;
}

async function get_air_temperature(page) {
  await reload_if_necessary();
  const [indoorAirElement] = await page.$x('//div[contains(@class, "dashboard-align-center")]/div[contains(@class, "dashboard-now-viewer") and contains(@l10n-path, "dashboard.now.indoor")]/p');
  const indoor = await indoorAirElement.evaluate(el => el.textContent);
  const [outdoorAirElement] = await page.$x('//div[contains(@class, "dashboard-align-center")]/div[contains(@class, "dashboard-now-viewer") and contains(@l10n-path, "dashboard.now.outdoor")]/p');
  const outdoor = await outdoorAirElement.evaluate(el => el.textContent);
  const [supplyAirElement] = await page.$x('//div[contains(@class, "dashboard-align-center")]/div[contains(@class, "dashboard-now-viewer") and contains(@l10n-path, "dashboard.now.supply")]/p');
  const supply = await supplyAirElement.evaluate(el => el.textContent);
  const [exhaustAirElement] = await page.$x('//div[contains(@class, "dashboard-align-center")]/div[contains(@class, "dashboard-now-viewer") and contains(@l10n-path, "dashboard.now.exhaust")]/p');
  const exhaust = await exhaustAirElement.evaluate(el => el.textContent);
  return 'indoor: ' + indoor + ', outdoor: ' + outdoor + ', supply: ' + supply + ', exhaust: ' + exhaust;
}

async function get_target_temperature(page) {
  await reload_if_necessary();

  const active_mode = await get_active_mode(page)
  const [activeModeButton] = await page.$x('//div[contains(@class, "dashboard-left")]/div[contains(@id, "profileradios")]/div[contains(@class, "dashboard-io-button") and contains(@dashboard, "' + active_mode + '")]')
  await activeModeButton.click();

  const [targetSupplyTemperatureElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-view-viewer") and contains(@l10n-path, ".supply")]/p');
  const targetSupplyTemperature = await targetSupplyTemperatureElement.evaluate(el => el.textContent);
  return targetSupplyTemperature;
}

async function set_target_fan_speed(page, fan_speed) {
  await reload_if_necessary();

  // Select active mode.
  const active_mode = await get_active_mode(page)
  const [activeModeButton] = await page.$x('//div[contains(@class, "dashboard-left")]/div[contains(@id, "profileradios")]/div[contains(@class, "dashboard-io-button") and contains(@dashboard, "' + active_mode + '")]')
  await activeModeButton.click();

  // Go to edit mode.
  const [dashboardEditElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-edit-limit-0") and contains(@dashboard, "-edit")]');
  await dashboardEditElement.click();

  // Enter the slider value.
  const [fanSpeedSettingElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-slider") and contains(@l10n-path, ".fanspeed")]//div[contains(@class, "ui-slider")]/input');
  await page.evaluate((fan_speed, element) => {
    element.value = fan_speed;
  }, fan_speed, fanSpeedSettingElement)
  await fanSpeedSettingElement.click()

  // Save the slider value.
  const [saveEditElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-dialog-ok")]');
  await saveEditElement.click();

  return fan_speed;
}


async function set_target_temperature(page, temperature) {
  await reload_if_necessary();

  // Select active mode.
  const active_mode = await get_active_mode(page)
  const [activeModeButton] = await page.$x('//div[contains(@class, "dashboard-left")]/div[contains(@id, "profileradios")]/div[contains(@class, "dashboard-io-button") and contains(@dashboard, "' + active_mode + '")]')
  await activeModeButton.click();

  // Go to edit mode.
  const [dashboardEditElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-edit-limit-0") and contains(@dashboard, "-edit")]');
  await dashboardEditElement.click();

  // Enter the slider value.
  const [supplyTemeratureSettingElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-slider") and contains(@l10n-path, ".supply")]//div[contains(@class, "ui-slider")]/input');
  await page.evaluate((temperature, element) => {
    element.value = temperature;
  }, temperature, supplyTemeratureSettingElement)
  await supplyTemeratureSettingElement.click()

  // Save the slider value.
  const [saveEditElement] = await page.$x('//div[contains(@class, "dashboard-view-placeholder") and contains(@profile, ' + active_mode + ')]//div[contains(@class, "dashboard-dialog-ok")]');
  await saveEditElement.click();

  return temperature
}

const all_status = async () => {
  let answer = ''
  answer += 'mode: ' + await get_active_mode(page) + '\n'
  answer += 'target_temperature: ' + await get_target_temperature(page) + '\n'
  answer += 'fan_speed: ' + await get_fan_speed(page) + '\n'
  answer += await get_air_temperature(page) + '\n'
  answer += await get_sensors(page)
  console.log(answer)
  return answer
}

const requestListener = async function (req, res) {
  const regex_list = [
    ['PUT', RegExp("^/mode/([0-3])"), async (req, res, args) => { res.end('' + await timeit(() => set_active_mode(page, args[1]))) }],
    ['GET', RegExp("^/mode$"), async (req, res) => { res.end('' + await timeit(() => get_active_mode(page))) }],
    ['PUT', RegExp("^/target_temperature/(\\d+)"), async (req, res, args) => { res.end('' + await timeit(() => set_target_temperature(page, args[1]))) }],
    ['PUT', RegExp("^/target_fan_speed/(\\d+)"), async (req, res, args) => { res.end('' + await timeit(() => set_target_fan_speed(page, args[1]))) }],
    ['GET', RegExp("^/target_temperature$"), async (req, res) => { res.end('' + await timeit(() => get_target_temperature(page))) }],
    ['GET', RegExp("^/fan_speed$"), async (req, res) => { res.end('' + await timeit(() => get_fan_speed(page))) }],
    ['GET', RegExp("^/air_temperature$"), async (req, res) => { res.end('' + await timeit(() => get_air_temperature(page))) }],
    ['GET', RegExp("^/sensors$"), async (req, res) => { res.end('' + await timeit(() => get_sensors(page))) }],
    ['GET', RegExp("^/all$"), async (req, res) => { res.end('' + await timeit(() => all_status())) }],
  ]

  let handled = false;
  for (let r = 0; r < regex_list.length; r++) {
    const [method, regex, handler] = regex_list[r]

    if (req.method !== method) continue;

    const result = req.url.match(regex)
    console.log(result)
    if (result) {
      res.writeHead(200);
      if (method == 'PUT') {
        handler(req, res, result);
      }
      else {
        handler(req, res);
      }
      handled = true;
      break;
    }

  }

  if (!handled) {
    res.writeHead(400)
    res.end("Invalid request")
  }
};

(async () => {
  if (process.argv.length !== 5) {
    throw new Error("Commandline arguments are wrong. Specify host_ip, host_port and vallox_ip\nExample usage: node vallox_puppeteer_http_server.mjs 192.168.199.8 5555 192.168.199.10")
  }
  const host = process.argv[2]
  const port = process.argv[3]
  const vallox_ip = process.argv[4]

  await page.setViewport({ width: 600, height: 800 });
  console.log(`Connecting to: http://${vallox_ip}...`)
  await page.goto(`http://${vallox_ip}`);

  const server = http.createServer(requestListener);
  server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
})();
