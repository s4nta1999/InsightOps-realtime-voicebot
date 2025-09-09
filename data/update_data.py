#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
하나카드 데이터 업데이트 스크립트
- consulting_date: 2025년 8월 1일 ~ 9월 12일 분배
- consulting_time: 오전 9시 ~ 오후 6시 랜덤 분배
- 상담 건수: 초반 일 100~150건 → 후반 일 200~300건으로 증가
"""

import json
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

def generate_date_distribution(total_files=7267):
    """
    상담 건수를 날짜별로 분배
    - 초반: 일 100~150건
    - 후반: 일 200~300건으로 증가
    """
    start_date = datetime(2025, 8, 1)
    end_date = datetime(2025, 9, 12)
    total_days = (end_date - start_date).days + 1
    
    # 날짜별 상담 건수 분배 (점진적 증가)
    daily_counts = {}
    current_date = start_date
    
    for i in range(total_days):
        # 초반에는 적게, 후반에는 많게
        progress = i / total_days
        if progress < 0.3:  # 초반 30%
            base_count = 100 + int(progress * 100)  # 100~130
        elif progress < 0.7:  # 중반 40%
            base_count = 130 + int((progress - 0.3) * 150)  # 130~190
        else:  # 후반 30%
            base_count = 190 + int((progress - 0.7) * 110)  # 190~300
        
        # 랜덤 변동 추가 (±20%)
        variation = random.uniform(0.8, 1.2)
        daily_counts[current_date.strftime('%Y-%m-%d')] = max(1, int(base_count * variation))
        current_date += timedelta(days=1)
    
    # 총 건수가 맞도록 조정
    total_allocated = sum(daily_counts.values())
    if total_allocated != total_files:
        # 가장 많은 날짜에서 조정
        max_date = max(daily_counts, key=daily_counts.get)
        daily_counts[max_date] += (total_files - total_allocated)
    
    return daily_counts

def generate_time_distribution():
    """
    상담 시간 분배 (오전 9시 ~ 오후 6시)
    - 업무 시간대에 집중
    """
    # 시간대별 가중치 (업무 시간에 집중)
    time_weights = {
        '09:00': 0.8, '09:30': 1.0, '10:00': 1.2, '10:30': 1.3,
        '11:00': 1.4, '11:30': 1.5, '12:00': 1.6, '12:30': 1.4,
        '13:00': 1.2, '13:30': 1.1, '14:00': 1.3, '14:30': 1.4,
        '15:00': 1.5, '15:30': 1.6, '16:00': 1.7, '16:30': 1.8,
        '17:00': 1.9, '17:30': 1.7, '18:00': 1.2
    }
    
    # 가중치 기반 랜덤 선택
    times = list(time_weights.keys())
    weights = list(time_weights.values())
    return random.choices(times, weights=weights)[0]

def update_json_file(file_path, file_index, daily_counts):
    """
    JSON 파일 업데이트
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not data or not isinstance(data, list) or len(data) == 0:
            print(f"⚠️  {file_path}: 유효하지 않은 데이터 형식")
            return False
        
        # 날짜 할당
        assigned_date = None
        for date_str, count in daily_counts.items():
            if count > 0:
                assigned_date = date_str
                daily_counts[date_str] -= 1
                break
        
        if not assigned_date:
            print(f"❌ {file_path}: 날짜 할당 실패")
            return False
        
        # 시간 생성
        consulting_time = generate_time_distribution()
        
        # 데이터 업데이트
        for item in data:
            if isinstance(item, dict):
                item['consulting_date'] = assigned_date
                item['consulting_time'] = consulting_time
        
        # 파일 저장
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent='\t')
        
        return True
        
    except Exception as e:
        print(f"❌ {file_path} 처리 중 오류: {e}")
        return False

def main():
    """
    메인 실행 함수
    """
    print("🚀 하나카드 데이터 업데이트 시작")
    
    # 데이터 디렉토리 경로
    data_dir = Path("data/01.원천데이터/TS_하나카드")
    
    if not data_dir.exists():
        print(f"❌ 디렉토리를 찾을 수 없습니다: {data_dir}")
        return
    
    # JSON 파일 목록 수집
    json_files = sorted([f for f in data_dir.glob("*.json")], 
                        key=lambda x: int(x.stem.split('_')[1]) if x.stem.split('_')[1].isdigit() else 0)
    
    total_files = len(json_files)
    print(f"📁 총 {total_files}개의 JSON 파일 발견")
    
    # 날짜 분배 생성
    daily_counts = generate_date_distribution(total_files)
    print(f"📅 날짜별 상담 건수 분배 완료 (총 {sum(daily_counts.values())}건)")
    
    # 상위 10개 날짜 출력
    print("\n📊 상위 10개 날짜별 상담 건수:")
    sorted_daily = sorted(daily_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    for date, count in sorted_daily:
        print(f"   {date}: {count}건")
    
    # 파일별 업데이트
    success_count = 0
    error_count = 0
    
    print(f"\n🔄 파일 업데이트 시작...")
    
    for i, file_path in enumerate(json_files, 1):
        if update_json_file(file_path, i, daily_counts):
            success_count += 1
            if i % 100 == 0:
                print(f"   진행률: {i}/{total_files} ({i/total_files*100:.1f}%)")
        else:
            error_count += 1
    
    print(f"\n✅ 업데이트 완료!")
    print(f"   성공: {success_count}개")
    print(f"   실패: {error_count}개")
    print(f"   총 파일: {total_files}개")
    
    # 최종 날짜 분배 확인
    print(f"\n📊 최종 날짜별 상담 건수:")
    for date, count in sorted(daily_counts.items()):
        if count > 0:
            print(f"   {date}: {count}건")

if __name__ == "__main__":
    main()
