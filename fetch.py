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
RESULTS_PER_PAGE = 5   # 多抓一些，過濾無文字貼文後保留最新 2 筆

BRANDS = [
    {
        "name": "可不可熟成紅茶",
        "id": "kebuke",
        "tag": "台資茶",
        "url": "https://www.facebook.com/kebuke2008"
    },
    {
        "name": "鶴茶樓",
        "id": "hechalou",
        "tag": "台資茶",
        "url": "https://www.facebook.com/hechaloutea"
    },
    {
        "name": "一沐日",
        "id": "aniceholiday",
        "tag": "台資茶",
        "url": "https://www.facebook.com/anicehoilday"
    },
    {
        "name": "青山",
        "id": "peaktea",
        "tag": "台資茶",
        "url": "https://www.facebook.com/peaktea.official"
    },
    {
        "name": "五桐號",
        "id": "wootea",
        "tag": "台資茶",
        "url": "https://www.facebook.com/WooTeaTW"
    },
    {
        "name": "UG 獨特綠",
        "id": "uniquegreen",
        "tag": "台資茶",
        "url": "https://www.facebook.com/uniquegreentea"
    },
    {
        "name": "迷客夏",
        "id": "milksha",
        "tag": "台資茶",
        "url": "https://www.facebook.com/Milkshatw"
    },
    {
        "name": "得正",
        "id": "dezheng",
        "tag": "台資茶",
        "url": "https://www.facebook.com/profile.php?id=100064036692208"
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


POSITIVE_KEYWORDS = [
    "新品", "上市", "登場", "限定", "limited", "新推出", "回歸", "開賣",
    "首賣", "新口味", "新登場", "限時", "全新", "驚喜", "limitednewly", "新品上市",
]

STRONG_NEGATIVE_KEYWORDS = [
    "開幕慶", "試營運", "新開幕", "門市休息", "暫停營業",
    "免費加料", "免費升級", "買一送一", "抽好禮",
]

WEAK_NEGATIVE_KEYWORDS = [
    "折扣", "折抵", "優惠碼", "抽獎", "任務通知",
]


def is_new_product_post(text):
    t = text.lower()
    strong_neg = sum(1 for kw in STRONG_NEGATIVE_KEYWORDS if kw in t)
    if strong_neg:
        return False
    score = sum(1 for kw in POSITIVE_KEYWORDS if kw.lower() in t)
    score -= sum(1 for kw in WEAK_NEGATIVE_KEYWORDS if kw in t)
    return score >= 1


def extract_preview(text, max_lines=4):
    lines = [l for l in text.strip().split("\n") if l.strip()]
    return "\n".join(lines[:max_lines])


def extract_image(item):
    media = item.get("media", [])
    if not isinstance(media, list):
        return ""
    for m in media:
        img = m.get("thumbnail") or m.get("imageHQ") or m.get("imageLQ") or ""
        if img and "fbcdn.net" in img:
            return img
    return ""


def transform(raw_items, brand_map):
    results = []
    for item in raw_items:
        raw_text = (item.get("text") or "").strip()
        if not raw_text:
            continue
        if not is_new_product_post(raw_text):
            continue
        page_url = item.get("facebookUrl", "")
        brand_info = brand_map.get(page_url, {})
        results.append({
            "brand": brand_info.get("name", item.get("user", {}).get("name", "")),
            "brandId": brand_info.get("id", ""),
            "tag": brand_info.get("tag", ""),
            "postText": extract_preview(item.get("text") or ""),
            "imageUrl": extract_image(item),
            "postUrl": item.get("url", ""),
            "timestamp": item.get("time", ""),
        })
    # 按時間降冪排序，每個品牌保留最新 2 筆
    results.sort(key=lambda x: x["timestamp"], reverse=True)
    seen = {}
    final = []
    for r in results:
        brand = r["brandId"]
        seen[brand] = seen.get(brand, 0) + 1
        if seen[brand] <= 2:
            final.append(r)
    return final


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
