"""
BobaTracker - Apify Facebook scraper
每日抓取各品牌粉專最新貼文，輸出 data.json
"""
import os
import json
import time
import requests

APIFY_TOKEN = os.environ["APIFY_TOKEN"]
ACTOR_ID = "apify~facebook-posts-scraper"
RESULTS_PER_PAGE = 2

BRANDS = [
    {
        "name": "可不可熟成紅茶",
        "id": "kebuke",
        "url": "https://www.facebook.com/kebuke2008"
    },
    {
        "name": "鶴茶樓",
        "id": "hechalou",
        "url": "https://www.facebook.com/hechaloutea"
    },
]


def run_actor(start_urls):
    url = f"https://api.apify.com/v2/acts/{ACTOR_ID}/runs"
    params = {"token": APIFY_TOKEN, "waitForFinish": 300}
    payload = {
        "startUrls": [{"url": u} for u in start_urls],
        "resultsLimit": RESULTS_PER_PAGE,
    }
    resp = requests.post(url, params=params, json=payload, timeout=320)
    resp.raise_for_status()
    return resp.json()["data"]


def fetch_dataset(dataset_id):
    url = f"https://api.apify.com/v2/datasets/{dataset_id}/items"
    params = {"token": APIFY_TOKEN, "limit": 100}
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def extract_image(item):
    media = item.get("media", [])
    if isinstance(media, list) and media:
        m = media[0]
        return m.get("imageHQ") or m.get("imageLQ") or m.get("url") or ""
    return ""


def transform(raw_items, brand_map):
    results = []
    for item in raw_items:
        page_url = item.get("facebookUrl", "")
        brand_info = brand_map.get(page_url, {})
        results.append({
            "brand": brand_info.get("name", item.get("user", {}).get("name", "")),
            "brandId": brand_info.get("id", ""),
            "postText": (item.get("text") or "").strip(),
            "imageUrl": extract_image(item),
            "postUrl": item.get("url", ""),
            "timestamp": item.get("time", ""),
        })
    # 按時間降冪排序
    results.sort(key=lambda x: x["timestamp"], reverse=True)
    return results


def main():
    brand_map = {b["url"]: b for b in BRANDS}
    start_urls = [b["url"] for b in BRANDS]

    print(f"[fetch] 開始抓取 {len(BRANDS)} 個品牌...")
    run_data = run_actor(start_urls)
    dataset_id = run_data["defaultDatasetId"]
    print(f"[fetch] Run 完成，dataset: {dataset_id}")

    raw_items = fetch_dataset(dataset_id)
    print(f"[fetch] 取得 {len(raw_items)} 則貼文")

    posts = transform(raw_items, brand_map)

    with open("data.json", "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"[fetch] data.json 寫入完成，共 {len(posts)} 筆")


if __name__ == "__main__":
    main()
