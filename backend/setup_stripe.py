"""VEXOR — Stripe catalog bootstrap (idempotent).

Creates the recurring subscription products/prices for VEXOR tiers:
- PULSE   R$14.99/month  (lookup_key: vexor_pulse_monthly)
- IGNITE  R$39.99/month  (lookup_key: vexor_ignite_monthly)

FREE is not a Stripe product — it's the default state for unpaid users.
"""
import os
from pathlib import Path

import stripe
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {
        "emergent_product_id": "vexor_pulse",
        "name": "VEXOR Pulse",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "vexor_pulse_monthly", "amount": 1499, "currency": "brl", "interval": "month"},
        ],
    },
    {
        "emergent_product_id": "vexor_ignite",
        "name": "VEXOR Ignite",
        "tax_code": "txcd_10103001",
        "prices": [
            {"lookup_key": "vexor_ignite_monthly", "amount": 3999, "currency": "brl", "interval": "month"},
        ],
    },
]


def get_or_create_product(entry):
    for p in stripe.Product.list(active=True).auto_paging_iter():
        if p.to_dict().get("metadata", {}).get("emergent_product_id") == entry["emergent_product_id"]:
            return p
    return stripe.Product.create(
        name=entry["name"],
        tax_code=entry.get("tax_code"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["emergent_product_id"]},
    )


def ensure_price(product, price_entry):
    existing = stripe.Price.list(lookup_keys=[price_entry["lookup_key"]], active=True, limit=1).data
    if existing and (existing[0].unit_amount != price_entry["amount"] or existing[0].currency != price_entry["currency"]):
        stripe.Price.modify(existing[0].id, active=False)
        existing = []
    if not existing:
        kwargs = dict(
            product=product.id,
            unit_amount=price_entry["amount"],
            currency=price_entry["currency"],
            lookup_key=price_entry["lookup_key"],
            transfer_lookup_key=True,
        )
        if price_entry.get("interval"):
            kwargs["recurring"] = {"interval": price_entry["interval"]}
        return stripe.Price.create(**kwargs)
    return existing[0]


def main():
    for entry in CATALOG:
        product = get_or_create_product(entry)
        for price_entry in entry["prices"]:
            price = ensure_price(product, price_entry)
            print(f"[ok] {entry['name']} → {price_entry['lookup_key']} → {price.id}")
    print("VEXOR Stripe catalog ready.")


if __name__ == "__main__":
    main()
