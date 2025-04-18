import fs from 'fs/promises';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
const apiBaseUrl = 'https://nodego.ai/api'

async function readFiles() {
  const proxyStr = await fs.readFile("proxies.txt", "utf-8");
  const proxies = proxyStr.trim().split("\n").map(proxy => proxy.trim());
  const tokenData = await fs.readFile("tokens.txt", "utf-8");
  const tokens = tokenData.trim().split("\n").map(token => token.trim());

  if (proxies.length < tokens.length) {
    console.log(`Số lượng proxies không thể nhỏ hơn số lượng tokens. Thêm proxy đủ cho tất cả token`)
    process.exit()
  }
  return { proxies, tokens };
}


async function ping(token, proxy) {
  try {
    const config = {
      method: "POST",
      url: `${apiBaseUrl}/user/nodes/ping`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "chrome-extension://jbmdcnidiaknboflpljihfnbonjgegah",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-Storage-Access": "active",
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${
          Math.floor(Math.random() * 15) + 100
        }.0.0.0 Safari/537.36`,
      },
      data: { type: "extension" },
      timeout: 5000,
    };

    if (proxy) {
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }

    const response = await axios(config);
    if (response.data.statusCode == 200 || response.data.statusCode == 201) {
      console.log(`Ping thành công`, 'success')
    }
  } catch (error) {
    console.log(`Ping không thành công: ${error.message}`, "error");
  }
}

async function main() {
  while(true) {
    try {
      const { proxies, tokens } = await readFiles()
      const pingAsync = []
      for (let i = 0; i < tokens.length; i++) {
        pingAsync.push(ping(tokens[i], proxies[i]))
      }
      await Promise.all(pingAsync);
      console.log(`Chờ 5 phút để bắt đầu ping lại`)
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000))
    } catch (error) {
      console.log(`Lỗi không mong muốn ${error}`, 'error')
    }
  }
}

main()
