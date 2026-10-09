from dataclasses import dataclass, asdict


@dataclass(frozen=True)
class Settings:
    match_threshold: float = 76
    strong_match: float = 85
    block_limit: int = 100
    shared_account_weight: float = 5
    shared_phone_weight: float = 2
    shared_address_weight: float = 1
    identity_weight: float = 4
    common_attribute_limit: int = 40
    shared_account_min: int = 4
    collector_min: int = 4
    cycle_limit: int = 500
    cycle_component_limit: int = 100
    identity_points: int = 35
    account_points: int = 40
    scheme_points: int = 35
    collector_points: int = 40
    cycle_points: int = 45
    batch_points: int = 35

    def public(self):
        return {**asdict(self), 'risk_thresholds': {'Medium': 30, 'High': 60, 'Critical': 80},
                'score_meaning': 'Review priority index, not a calibrated fraud probability',
                'exclusive_schemes': [['SCH-01', 'SCH-02']]}


CONFIG = Settings()


def level(score):
    return 'Critical' if score >= 80 else 'High' if score >= 60 else 'Medium' if score >= 30 else 'Low'
