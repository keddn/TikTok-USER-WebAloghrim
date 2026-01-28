import requests
from urllib.parse import urlencode
import json

KED = "http://localhost:8002"
ssid = "ur account sessionid"


def check_username(username):
    params = {
        "WebIdLastTime": "1763048739",
        "aid": "1988",
        "app_language": "En",
        "app_name": "tiktok_web",
        "browser_language": "en-EN",
        "browser_name": "Mozilla",
        "browser_online": "true",
        "browser_platform": "Win32",
        "browser_version": "5.0 (Windows NT 10.0; Win64; x64)",
        "channel": "tiktok_web",
        "cookie_enabled": "true",
        "data_collection_enabled": "true",
        "device_id": "7572236744583202355",
        "device_platform": "web_pc",
        "focus_state": "true",
        "from_page": "user",
        "history_len": "4",
        "is_fullscreen": "false",
        "is_page_visible": "true",
        "os": "windows",
        "priority_region": "KD",
        "region": "KD",
        "screen_height": "1080",
        "screen_width": "1920",
        "tz_name": "March/Space",
        "unique_id": username,
        "user_is_login": "true",
        "webcast_language": "en",
        "msToken": "mk6b_3wl3iYZaoBGwEKDIh9ERnyvzWcYR0oweLhncW5PYi1QOIJ1WWiBJoxncIuKEDSqkxFKElXLdCNOdslKbboloAqbpxkX7JGl0SprQjcIFD1gQB8qPwlcUWjPeBiSKj08_L-iXp-KUq8=",
    }
    
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36"
    
    query_string = urlencode(params)
    sigs = requests.post(f'{KED}/sign', json={'query': query_string, 'body': '', 'includeBogus': True, 'version': '5.1.1'}, headers={'User-Agent': user_agent}).json()
    
    params['X-Bogus'] = sigs['xBogus']
    params['X-Gnarly'] = sigs['xGnarly']
    
    headers = {
        "accept": "*/*",
        "accept-language": "fr-FR,fr;q=0.9,en;q=0.8,ar;q=0.5",
        "referer": "https://www.tiktok.com/",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "user-agent": user_agent,
    }
    
    cookies = {
        "sessionid": ssid,
        "sid_tt": ssid, 
        "ttwid": "1|ked",
    }
    
    session = requests.Session()
    session.headers.update(headers)
    session.cookies.update(cookies)
    
    response = session.get("https://www.tiktok.com/api/uniqueid/check/", params=params, timeout=10)
    return response.json()

username = input("[!] ENTER USERNAME : ")
result = check_username(username)

print(json.dumps(result, indent=2, ensure_ascii=False))

