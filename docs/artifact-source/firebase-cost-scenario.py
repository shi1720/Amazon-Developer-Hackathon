"""Illustrative serving charges, not measured usage or a total GCP bill.

Rates reviewed 2026-09-15. See market-and-business.md for sources, exclusions,
the shared billing-account allowance caveat, and the proposed retention policy.
"""
from decimal import Decimal as D
import json

DAYS = D(30)
REFRESHES = D(4) * D(76)  # four users; initial refresh + 75 twelve-second polls
REQUESTS_PER_HOUSEHOLD_DAY = REFRESHES + 6 * 3 + 12
# Six reads per authenticated refresh reflect transactional authorization.
# MCP and other-request budgets remain conservative pending measured telemetry.
READS_PER_HOUSEHOLD_DAY = REFRESHES * 6 + 6 * 20 + 12 * 6


def scenario(households):
    h = D(households)
    requests = h * REQUESTS_PER_HOUSEHOLD_DAY * DAYS
    cpu_seconds = requests * D('0.3')  # assumed allocated billable time, not CPU profiling
    gib_seconds = cpu_seconds * D('0.25')
    reads_day = h * READS_PER_HOUSEHOLD_DAY
    writes_day = h * 18
    deletes_day = h * 6
    stored_gib = h * 2 / 1024
    hosting_gb = h * D('0.016') * DAYS
    compute = (
        max(D(0), cpu_seconds - 180000) * D('0.000024')
        + max(D(0), gib_seconds - 360000) * D('0.0000025')
        + max(D(0), requests - 2000000) / 1000000 * D('0.40')
    )
    compute_without_shared_allowances = (
        cpu_seconds * D('0.000024')
        + gib_seconds * D('0.0000025')
        + requests / 1000000 * D('0.40')
    )
    firestore = (
        max(D(0), reads_day - 50000) * DAYS / 100000 * D('0.03')
        + max(D(0), writes_day - 20000) * DAYS / 100000 * D('0.09')
        + max(D(0), deletes_day - 20000) * DAYS / 100000 * D('0.01')
        + max(D(0), stored_gib - 1) * 720 * D('0.000205479')
    )
    hosting = max(D(0), hosting_gb - 10) * D('0.15')
    return {
        'households': households,
        'requests_month': requests,
        'allocated_vcpu_seconds_month': cpu_seconds,
        'gib_seconds_month': gib_seconds,
        'firestore_reads_day': reads_day,
        'firestore_writes_day': writes_day,
        'ordinary_firestore_deletes_day': deletes_day,
        'firestore_storage_gib': stored_gib,
        'hosting_transfer_gb_month': hosting_gb,
        'cloud_run_usd': compute,
        'firestore_usd': firestore,
        'hosting_usd': hosting,
        'selected_serving_subtotal_usd': compute + firestore + hosting,
        'subtotal_if_cloud_run_allowances_used_elsewhere_usd': compute_without_shared_allowances + firestore + hosting,
    }


if __name__ == '__main__':
    assert REQUESTS_PER_HOUSEHOLD_DAY == 334
    assert READS_PER_HOUSEHOLD_DAY == 2016
    print(json.dumps([scenario(h) for h in [5, 20, 1000]], indent=2,
                     default=lambda value: str(value)))
