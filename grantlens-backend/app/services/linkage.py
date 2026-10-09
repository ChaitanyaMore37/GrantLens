from collections import defaultdict
from itertools import combinations
import jellyfish
from rapidfuzz import fuzz
from rapidfuzz.distance import Levenshtein
from app.core import CONFIG


def link(records, config=CONFIG):
    blocks = defaultdict(list)
    indexed = {r['beneficiary_id']:r for r in records}
    for r in records:
        surname = r['name_normalized'].split()[-1]
        for key in [('phone',r['phone']), ('account',r['bank_account_id']),
                    ('dob',r['dob'],r['district']), ('phonetic',jellyfish.metaphone(surname),r['pincode'])]:
            blocks[key].append(r['beneficiary_id'])
    candidates, skipped = set(), 0
    for members in blocks.values():
        if len(members) > config.block_limit:
            skipped += 1
            continue
        candidates.update(combinations(sorted(members),2))
    matches = []
    for a,b in sorted(candidates):
        x,y = indexed[a],indexed[b]
        signals = {'dob': x['dob']==y['dob'], 'phone':x['phone']==y['phone'],
                   'account':x['bank_account_id']==y['bank_account_id'],
                   'address':fuzz.ratio(x['address_normalized'],y['address_normalized']) >= 95,
                   'phonetic':jellyfish.metaphone(x['name_normalized'])==jellyfish.metaphone(y['name_normalized'])}
        name = max(Levenshtein.normalized_similarity(x['name_normalized'],y['name_normalized'])*100,
                   fuzz.token_set_ratio(x['name_normalized'],y['name_normalized']))
        xt,yt=x['name_normalized'].split(),y['name_normalized'].split()
        initials_compatible=(len(xt)==len(yt) and all(a==b or (min(len(a),len(b))==1 and a[0]==b[0]) for a,b in zip(xt,yt)))
        if initials_compatible:
            name=max(name,90)
        signals['compatible_initials']=initials_compatible
        score = name*.30 + 25*signals['dob'] + 20*signals['phone'] + 10*signals['account'] + 10*signals['address'] + 5*signals['phonetic']
        if not signals['dob']:
            score = max(0,score-25)
        # Require corroborating identifiers; similar names never merge entities.
        if score >= config.match_threshold and sum(signals[k] for k in ['dob','phone','account','address']) >= 2:
            matches.append({'first_beneficiary_id':a,'second_beneficiary_id':b,'match_score':round(score,2),
                            'matching_attributes':[k for k,v in signals.items() if v],
                            'conflicting_attributes':[k for k in ['dob','phone','account'] if not signals[k]],
                            'name_similarity':round(name,2),'confidence':'Strong' if score>=config.strong_match else 'Tentative',
                            'explanation':'Potential identity link supported by multiple attributes; manual verification required.',
                            'verified_merge':False})
    return matches, {'candidate_pairs':len(candidates),'skipped_large_blocks':skipped}
