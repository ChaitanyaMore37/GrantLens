import argparse
from app.services.synthetic import generate

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--count',type=int,default=10000)
    p.add_argument('--output',default='data/synthetic')
    p.add_argument('--seed',type=int,default=17)
    args=p.parse_args()
    print(generate(args.output,args.count,args.seed))
