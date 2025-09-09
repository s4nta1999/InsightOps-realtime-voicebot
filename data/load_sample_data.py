#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
하나카드 샘플 데이터 적재 스크립트
- data/ 폴더의 JSON 파일들을 읽어서 API를 통해 데이터베이스에 적재
- voc_normalized 테이블에 데이터 저장
"""

import json
import os
import requests
import time
from pathlib import Path
from typing import List, Dict, Any

class DataLoader:
    def __init__(self, api_base_url: str = "http://localhost:8082/api"):
        self.api_base_url = api_base_url
        self.enhanced_classify_url = f"{api_base_url}/enhanced-classify"
        self.health_url = f"{api_base_url}/health"
        
    def check_service_health(self) -> bool:
        """서비스 상태 확인"""
        try:
            response = requests.get(self.health_url, timeout=5)
            if response.status_code == 200:
                print("✅ 서비스가 정상적으로 실행 중입니다.")
                return True
            else:
                print(f"❌ 서비스 상태 확인 실패: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ 서비스 연결 실패: {e}")
            return False
    
    def load_json_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """JSON 파일 로드"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if not isinstance(data, list) or len(data) == 0:
                print(f"⚠️  {file_path.name}: 유효하지 않은 데이터 형식")
                return []
            
            return data
        except Exception as e:
            print(f"❌ {file_path.name} 로드 실패: {e}")
            return []
    
    def convert_to_api_format(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """JSON 데이터를 API 형식으로 변환"""
        return {
            "source_id": item.get("source_id", ""),
            "consulting_content": item.get("consulting_content", ""),
            "consulting_date": item.get("consulting_date", ""),
            "consulting_time": item.get("consulting_time", ""),
            "client_gender": item.get("client_gender", ""),
            "client_age": item.get("client_age", ""),
            "consulting_turns": int(item.get("consulting_turns", 0)) if item.get("consulting_turns") else 0,
            "consulting_length": int(item.get("consulting_length", 0)) if item.get("consulting_length") else 0
        }
    
    def send_to_api(self, data: Dict[str, Any]) -> bool:
        """API로 데이터 전송"""
        try:
            headers = {"Content-Type": "application/json"}
            response = requests.post(
                self.enhanced_classify_url, 
                json=data, 
                headers=headers, 
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success", False):
                    return True
                else:
                    print(f"❌ API 응답 오류: {result.get('error', 'Unknown error')}")
                    return False
            else:
                print(f"❌ HTTP 오류: {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ API 호출 실패: {e}")
            return False
    
    def load_sample_data(self, max_files: int = None, delay: float = 0.1):
        """샘플 데이터 적재"""
        print("🚀 하나카드 샘플 데이터 적재 시작")
        
        # 서비스 상태 확인
        if not self.check_service_health():
            print("❌ 서비스가 실행되지 않았습니다. 먼저 서비스를 시작해주세요.")
            return
        
        # 데이터 디렉토리 경로
        data_dir = Path("data")
        
        if not data_dir.exists():
            print(f"❌ 디렉토리를 찾을 수 없습니다: {data_dir}")
            return
        
        # JSON 파일 목록 수집
        json_files = sorted([f for f in data_dir.glob("하나카드_*.json")], 
                           key=lambda x: int(x.stem.split('_')[1]) if x.stem.split('_')[1].isdigit() else 0)
        
        if max_files:
            json_files = json_files[:max_files]
        
        total_files = len(json_files)
        print(f"📁 총 {total_files}개의 JSON 파일 발견")
        
        success_count = 0
        error_count = 0
        total_records = 0
        
        print(f"\n🔄 데이터 적재 시작...")
        
        for i, file_path in enumerate(json_files, 1):
            print(f"\n📄 처리 중: {file_path.name} ({i}/{total_files})")
            
            # JSON 파일 로드
            data_list = self.load_json_file(file_path)
            
            if not data_list:
                error_count += 1
                continue
            
            # 각 레코드 처리
            file_success = 0
            file_error = 0
            
            for j, item in enumerate(data_list, 1):
                # API 형식으로 변환
                api_data = self.convert_to_api_format(item)
                
                # API로 전송
                if self.send_to_api(api_data):
                    file_success += 1
                    total_records += 1
                else:
                    file_error += 1
                
                # 진행률 표시
                if j % 5 == 0 or j == len(data_list):
                    print(f"   레코드 {j}/{len(data_list)} 처리 완료")
                
                # API 부하 방지를 위한 지연
                if delay > 0:
                    time.sleep(delay)
            
            if file_success > 0:
                success_count += 1
                print(f"✅ {file_path.name}: {file_success}개 레코드 성공")
            else:
                error_count += 1
                print(f"❌ {file_path.name}: 모든 레코드 실패")
            
            # 전체 진행률 표시
            if i % 10 == 0 or i == total_files:
                print(f"\n📊 전체 진행률: {i}/{total_files} ({i/total_files*100:.1f}%)")
                print(f"   성공한 파일: {success_count}개")
                print(f"   실패한 파일: {error_count}개")
                print(f"   총 적재된 레코드: {total_records}개")
        
        print(f"\n🎉 데이터 적재 완료!")
        print(f"   성공한 파일: {success_count}개")
        print(f"   실패한 파일: {error_count}개")
        print(f"   총 적재된 레코드: {total_records}개")
        
        # 통계 확인
        self.show_statistics()
    
    def show_statistics(self):
        """적재된 데이터 통계 확인"""
        try:
            # 카테고리별 통계
            category_url = f"{self.api_base_url}/classify/statistics/category"
            response = requests.get(category_url, timeout=10)
            
            if response.status_code == 200:
                stats = response.json()
                if stats.get("success", False):
                    print(f"\n📈 카테고리별 통계:")
                    data = stats.get("data", {})
                    for category, count in sorted(data.items(), key=lambda x: x[1], reverse=True)[:10]:
                        print(f"   {category}: {count}건")
            
            # 이력 조회
            history_url = f"{self.api_base_url}/classify/history?size=5"
            response = requests.get(history_url, timeout=10)
            
            if response.status_code == 200:
                history = response.json()
                if history.get("success", False):
                    print(f"\n📋 최근 처리된 상담:")
                    data = history.get("data", {}).get("content", [])
                    for item in data[:3]:
                        category = item.get("analysis_result", {}).get("classification", {}).get("category", "Unknown")
                        source_id = item.get("source_id", "Unknown")
                        print(f"   {source_id}: {category}")
        
        except Exception as e:
            print(f"⚠️  통계 조회 실패: {e}")

def main():
    """메인 실행 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description="하나카드 샘플 데이터 적재")
    parser.add_argument("--max-files", type=int, help="처리할 최대 파일 수 (테스트용)")
    parser.add_argument("--delay", type=float, default=0.1, help="API 호출 간 지연 시간 (초)")
    parser.add_argument("--api-url", default="http://localhost:8082/api", help="API 기본 URL")
    
    args = parser.parse_args()
    
    loader = DataLoader(args.api_url)
    loader.load_sample_data(max_files=args.max_files, delay=args.delay)

if __name__ == "__main__":
    main()
