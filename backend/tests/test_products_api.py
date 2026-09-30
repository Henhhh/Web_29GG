import pytest

from app import create_app
from db import get_db, init_db
from seed import seed_products


@pytest.fixture
def client(tmp_path):
    app = create_app({
        "TESTING": True,
        "SECRET_KEY": "products-test-key-" * 3,
        "DB_FILE": str(tmp_path / "products.db"),
    })
    with app.app_context():
        init_db()
        seed_products()
    return app.test_client()


def test_product_catalog_and_pagination(client):
    response = client.get("/api/products?page=2&page_size=5")

    assert response.status_code == 200
    data = response.json["data"]
    assert (data["total"], data["page"], data["page_size"]) == (60, 2, 5)
    assert len(data["items"]) == 5
    assert data["items"][0]["id"] < data["items"][-1]["id"]
    assert {"specs", "connections", "category", "brand"} <= data["items"][0].keys()
    assert "specs_json" not in data["items"][0]


def test_catalog_search_and_filters(client):
    response = client.get(
        "/api/products?q=Logitech&category=mouse&page_size=100"
    )
    items = response.json["data"]["items"]

    assert response.status_code == 200
    assert items
    assert all(item["category"] == "mouse" for item in items)
    assert all("logitech" in item["brand"].lower() or "logitech" in item["name"].lower() for item in items)


def test_repeated_brand_filters_are_or_and_filter_groups_are_and(client):
    response = client.get(
        "/api/products?category=mouse&brand=Logitech&brand=Razer&page_size=100"
    )
    items = response.json["data"]["items"]

    assert response.status_code == 200
    assert items
    assert all(item["category"] == "mouse" for item in items)
    assert {item["brand"].lower() for item in items} <= {"logitech", "razer"}


def test_repeated_monitor_specs_are_or(client):
    response = client.get(
        "/api/products?category=monitor&refresh_rate=144&refresh_rate=240&screen_size=27&screen_size=23.8&page_size=100"
    )
    items = response.json["data"]["items"]

    assert response.status_code == 200
    assert items
    assert all(item["category"] == "monitor" for item in items)
    assert {item["refresh_rate"] for item in items} <= {144, 240}
    assert {item["screen_size"] for item in items} <= {23.8, 27.0}


def test_product_detail_and_not_found(client):
    first_product = client.get("/api/products?page_size=1").json["data"]["items"][0]
    detail = client.get(f"/api/products/{first_product['id']}")
    missing = client.get("/api/products/99999")

    assert detail.status_code == 200
    assert detail.json["data"]["id"] == first_product["id"]
    assert isinstance(detail.json["data"]["specs"], list)
    assert isinstance(detail.json["data"]["connections"], list)
    assert missing.status_code == 404
    assert missing.json["error"]["code"] == "not_found"


def test_categories_and_brands(client):
    categories = client.get("/api/categories")
    brands = client.get("/api/brands")

    assert categories.status_code == brands.status_code == 200
    assert len(categories.json["data"]) == 6
    assert categories.json["data"][0].keys() == {"id", "name", "slug"}
    assert brands.json["data"]
    assert brands.json["data"] == sorted(brands.json["data"], key=lambda brand: brand["id"])


@pytest.mark.parametrize(
    "query,field",
    [
        ("page=0", "page"),
        ("page_size=101", "page_size"),
        ("min_price=not-a-number", "min_price"),
        ("max_price=10&max_price_exclusive=20", "max_price_exclusive"),
        ("screen_size=0", "screen_size"),
        ("refresh_rate=60Hz", "refresh_rate"),
    ],
)
def test_invalid_filter_query_returns_field_errors(client, query, field):
    response = client.get(f"/api/products?{query}")

    assert response.status_code == 422
    assert response.json["error"]["code"] == "validation_failed"
    assert field in response.json["error"]["details"]


def test_connection_filter_and_total_are_not_duplicated(client):
    with client.application.app_context():
        row = get_db().execute(
            "SELECT connection FROM product_connections ORDER BY product_id LIMIT 1"
        ).fetchone()
    connection = row["connection"]

    response = client.get(f"/api/products?connection={connection}&page_size=100")
    data = response.json["data"]

    assert response.status_code == 200
    assert data["total"] == len(data["items"])
    assert data["items"]
    assert all(connection in item["connections"] for item in data["items"])
