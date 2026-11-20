"""
generate_sample_data.py
Generates realistic, comprehensive synthetic datasets for:
1. NGO Donation Claim Matching (within 20km radius of food provider)
2. Volunteer Pickup Mission Matching (within 30km dual-radius of both provider and NGO)
"""

import os
import csv
import random
import math

SEED = 42
random.seed(SEED)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(OUTPUT_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

NGO_DATASET_PATH = os.path.join(DATA_DIR, 'ngo_matching_train.csv')
VOLUNTEER_DATASET_PATH = os.path.join(DATA_DIR, 'volunteer_matching_train.csv')

def generate_ngo_dataset(n_samples=2500):
    """
    Generates training dataset for NGO donation matching.
    Constraint: Only NGOs <= 20km should be viable matches.
    """
    headers = [
        'distance_km',
        'distance_ratio_20km',
        'donation_quantity',
        'ngo_capacity',
        'capacity_fit_ratio',
        'capacity_overflow_risk',
        'food_category_match',
        'hours_to_expiry',
        'days_since_last_donation',
        'ngo_rating',
        'ngo_completion_rate',
        'is_within_20km',
        'match_success'
    ]

    rows = []
    for _ in range(n_samples):
        # Sample distance: 75% within 20km, 25% outside (20-35km) for negative bounds learning
        if random.random() < 0.75:
            distance_km = round(random.uniform(0.3, 19.9), 2)
        else:
            distance_km = round(random.uniform(20.1, 35.0), 2)

        is_within_20km = 1 if distance_km <= 20.0 else 0
        distance_ratio = round(distance_km / 20.0, 3)

        donation_qty = random.randint(15, 300)
        ngo_capacity = random.randint(30, 500)
        capacity_ratio = round(donation_qty / max(ngo_capacity, 1), 3)
        capacity_overflow_risk = 1 if capacity_ratio > 1.0 else 0

        # Category match: 1.0 (preferred), 0.5 (acceptable), 0.0 (mismatch)
        category_match = random.choice([1.0, 1.0, 0.7, 0.5, 0.0])

        hours_to_expiry = round(random.uniform(1.0, 48.0), 1)
        days_since_last_donation = random.randint(0, 30)
        ngo_rating = round(random.uniform(3.0, 5.0), 2)
        ngo_completion_rate = round(random.uniform(0.60, 1.0), 2)

        # Ground truth simulation logic:
        # A match succeeds if NGO is within 20km, capacity is not grossly overloaded,
        # food is safe before expiry, and NGO is reliable.
        if not is_within_20km:
            match_success = 0
        else:
            # Latent suitability score
            dist_score = (20.0 - distance_km) / 20.0  # 1.0 closest, 0.0 at 20km
            cap_score = 1.0 if capacity_ratio <= 0.8 else (0.5 if capacity_ratio <= 1.2 else 0.1)
            urgency_score = min(1.0, days_since_last_donation / 10.0) # higher need
            expiry_safety = 1.0 if hours_to_expiry >= (distance_km / 15.0 + 1.0) else 0.2

            z = (
                3.0 * dist_score +
                2.0 * cap_score +
                1.5 * category_match +
                1.5 * ngo_completion_rate +
                1.0 * (ngo_rating / 5.0) +
                1.2 * urgency_score +
                1.5 * expiry_safety -
                4.5 # threshold intercept
            )
            prob = 1.0 / (1.0 + math.exp(-z))
            match_success = 1 if random.random() < prob else 0

        rows.append([
            distance_km,
            distance_ratio,
            donation_qty,
            ngo_capacity,
            capacity_ratio,
            capacity_overflow_risk,
            category_match,
            hours_to_expiry,
            days_since_last_donation,
            ngo_rating,
            ngo_completion_rate,
            is_within_20km,
            match_success
        ])

    with open(NGO_DATASET_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Generated {len(rows)} NGO matching samples at: {NGO_DATASET_PATH}")

def generate_volunteer_dataset(n_samples=3000):
    """
    Generates training dataset for Volunteer Pickup matching.
    Constraint: Volunteer MUST be within 30km of BOTH food provider AND NGO.
    """
    headers = [
        'dist_to_provider_km',
        'dist_to_ngo_km',
        'max_of_two_distances_km',
        'total_route_estimate_km',
        'both_within_30km',
        'parcel_weight_kg',
        'vehicle_type',
        'vehicle_capacity_match',
        'volunteer_rating',
        'active_deliveries',
        'volunteer_completion_rate',
        'hours_to_expiry',
        'eta_minutes_to_pickup',
        'pickup_success'
    ]

    vehicle_speeds = {
        'on_foot': 5.0,
        'bike': 18.0,
        'car': 35.0,
        'van': 35.0
    }

    rows = []
    for _ in range(n_samples):
        # Distances: mix of both <= 30km (valid), one <= 30km (invalid), neither <= 30km (invalid)
        r = random.random()
        if r < 0.65:
            # Both within 30km
            d_provider = round(random.uniform(0.5, 29.5), 2)
            d_ngo = round(random.uniform(0.5, 29.5), 2)
        elif r < 0.82:
            # Within 30km of provider, but outside 30km from NGO
            d_provider = round(random.uniform(1.0, 28.0), 2)
            d_ngo = round(random.uniform(30.5, 55.0), 2)
        elif r < 0.94:
            # Within 30km of NGO, but outside 30km from provider
            d_provider = round(random.uniform(30.5, 55.0), 2)
            d_ngo = round(random.uniform(1.0, 28.0), 2)
        else:
            # Far from both
            d_provider = round(random.uniform(31.0, 60.0), 2)
            d_ngo = round(random.uniform(31.0, 60.0), 2)

        both_within_30km = 1 if (d_provider <= 30.0 and d_ngo <= 30.0) else 0
        max_dist = max(d_provider, d_ngo)
        route_estimate = round(d_provider + d_ngo, 2)

        parcel_weight_kg = round(random.uniform(1.5, 100.0), 1)
        vehicle_type = random.choice(['bike', 'car', 'car', 'van', 'on_foot'])

        # Vehicle capacity match factor
        if vehicle_type == 'on_foot':
            veh_match = 1.0 if parcel_weight_kg <= 8.0 else (0.4 if parcel_weight_kg <= 15.0 else 0.0)
        elif vehicle_type == 'bike':
            veh_match = 1.0 if parcel_weight_kg <= 20.0 else (0.6 if parcel_weight_kg <= 35.0 else 0.1)
        elif vehicle_type == 'car':
            veh_match = 1.0 if parcel_weight_kg <= 80.0 else 0.8
        else: # van
            veh_match = 1.0

        volunteer_rating = round(random.uniform(3.5, 5.0), 2)
        active_deliveries = random.choice([0, 0, 0, 1, 1, 2, 3])
        volunteer_completion_rate = round(random.uniform(0.70, 1.0), 2)
        hours_to_expiry = round(random.uniform(1.5, 24.0), 1)

        speed = vehicle_speeds[vehicle_type]
        eta_minutes = round((d_provider / speed) * 60.0, 1)

        # Ground truth outcome:
        # If volunteer is NOT in 30km range of BOTH provider and NGO -> MUST BE 0.
        if not both_within_30km:
            pickup_success = 0
        else:
            # Latent success score
            provider_proximity_score = (30.0 - d_provider) / 30.0
            ngo_proximity_score = (30.0 - d_ngo) / 30.0
            avg_proximity = (provider_proximity_score + ngo_proximity_score) / 2.0

            avail_penalty = 0.0 if active_deliveries == 0 else (0.35 if active_deliveries == 1 else 0.8)
            time_cushion_ok = 1.0 if (hours_to_expiry * 60.0) > (eta_minutes + 45.0) else 0.2

            z = (
                2.8 * avg_proximity +
                2.5 * veh_match +
                1.8 * volunteer_completion_rate +
                1.0 * (volunteer_rating / 5.0) +
                1.5 * time_cushion_ok -
                2.0 * avail_penalty -
                3.2 # threshold
            )
            prob = 1.0 / (1.0 + math.exp(-z))
            pickup_success = 1 if random.random() < prob else 0

        rows.append([
            d_provider,
            d_ngo,
            max_dist,
            route_estimate,
            both_within_30km,
            parcel_weight_kg,
            vehicle_type,
            veh_match,
            volunteer_rating,
            active_deliveries,
            volunteer_completion_rate,
            hours_to_expiry,
            eta_minutes,
            pickup_success
        ])

    with open(VOLUNTEER_DATASET_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    print(f"Generated {len(rows)} Volunteer matching samples at: {VOLUNTEER_DATASET_PATH}")

if __name__ == '__main__':
    print("Generating Smart Matching ML Sample Data...")
    generate_ngo_dataset(2500)
    generate_volunteer_dataset(3000)
    print("Done!")
