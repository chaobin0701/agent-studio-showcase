"""Import public, pinned Contoso fixtures; never reads upstream configuration."""
import argparse
import concurrent.futures
import csv
import hashlib
import io
import json
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
COMMIT = "028921fe3209db3216075d34ced6c109de132533"
UPSTREAM = "https://raw.githubusercontent.com/Azure-Samples/contoso-chat/" + COMMIT + "/"
parser = argparse.ArgumentParser()
parser.add_argument("--source-dir", type=pathlib.Path)
args = parser.parse_args()
hashes = {}

def read(path):
    cached = args.source_dir / path if args.source_dir else None
    if cached and cached.is_file():
        raw = cached.read_bytes()
    else:
        for attempt in range(4):
            try:
                raw = urllib.request.urlopen(UPSTREAM + path, timeout=25).read()
                break
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(1)
    hashes[path] = hashlib.sha256(raw).hexdigest()
    return raw.decode("utf-8-sig")

def save(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

def save_json(path, value):
    save(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")

paths = ["LICENSE", "data/product_info/products.csv"]
paths += [f"data/customer_info/customer_info_{i}.json" for i in range(1, 13)]
paths += [f"data/manual_info/manuals/product_info_{i}.md" for i in range(1, 21)]
paths += ["src/api/contoso_chat/chat.prompty", "src/api/contoso_chat/product/product.prompty"]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    sources = dict(zip(paths, pool.map(read, paths)))

products = []
for row in csv.DictReader(io.StringIO(sources["data/product_info/products.csv"])):
    manual = sources[f"data/manual_info/manuals/product_info_{row['id']}.md"]
    section = re.search(r"^## Technical (?:Specs|Specifications)\s*\n(.*?)(?=^## |\Z)", manual, re.M | re.S)
    if not section:
        raise ValueError(f"Missing technical specifications for product {row['id']}")
    specs = {}
    for line in section[1].splitlines():
        match = re.match(r"^\s*(?:-\s*)?\*\*(.+?)\*\*\s*:?\s*(.+?)\s*$", line)
        if match:
            specs[match[1].strip().rstrip(":").strip()] = match[2].strip()
    capacity = specs.get("Capacity", "")
    people = re.search(r"(\d+)[ -]?(?:person|people)", capacity, re.I)
    products.append({**row, "price": float(row["price"]), "currency": "USD", "specs": specs,
                     "capacityPeople": int(people[1]) if people else None})
    save(f"data/contoso/manuals/product_info_{row['id']}.md", manual)

customers = []
for i in range(1, 13):
    raw = json.loads(sources[f"data/customer_info/customer_info_{i}.json"])
    orders = []
    for order in raw["orders"]:
        month, day, year = map(int, order["date"].split("/"))
        orders.append({"id": str(order["id"]), "productId": str(order["productId"]),
                       "quantity": order["quantity"], "total": order["total"],
                       "unitPrice": order["unitprice"], "date": f"{year:04}-{month:02}-{day:02}"})
    customers.append({"id": str(raw["id"]), "name": raw["firstName"] + " " + raw["lastName"],
                      "membership": None if raw["membership"] == "nan" else raw["membership"],
                      "orders": sorted(orders, key=lambda o: (o["date"], o["id"]), reverse=True)})

save_json("data/contoso/products.json", products)
save_json("data/contoso/customers.json", customers)
save_json("data/contoso/profiles.json", [{"id": "contoso-" + c["id"], "customerId": c["id"],
           "name": c["name"], "avatar": ["#e7f0ff", "#e5f1ec", "#fff1df"][i % 3]} for i, c in enumerate(customers)])
save("data/contoso/source/products.csv", sources["data/product_info/products.csv"])
save("data/contoso/source/chat.prompty", sources["src/api/contoso_chat/chat.prompty"])
save("data/contoso/source/product.prompty", sources["src/api/contoso_chat/product/product.prompty"])
save("licenses/contoso-chat.txt", sources["LICENSE"])
save_json("data/contoso/provenance.json", {"repository": "https://github.com/Azure-Samples/contoso-chat",
           "commit": COMMIT, "license": "MIT", "simulated": True, "recordYears": [2023],
           "normalization": ["Removed unused sample contact fields", "Dates converted from M/D/YYYY to ISO date",
             "Orders sorted newest first", "Literal nan membership converted to null", "Prices remain sample USD amounts",
             "Structured specs extracted only from Technical Specs; manual guidance remains in the original manuals"],
           "sourceSha256": dict(sorted(hashes.items()))})
print(f"Imported {len(products)} products, {len(customers)} fictional customers, "
      f"{sum(len(c['orders']) for c in customers)} orders and 20 manuals; license retained.")
