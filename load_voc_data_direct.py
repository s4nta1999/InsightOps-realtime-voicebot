#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VocRaw 테이블용 직접 데이터 적재 스크립트
- data/ 폴더의 JSON 파일들을 읽어서 voc_raw 테이블에 직접 적재
"""

import json
import os
import psycopg2
import time
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

class VocDataLoader:
    def __init__(self, database_url: str = "postgresql://voicebot_user:voicebot_password@localhost:5433/voicebot_db"):
        self.database_url = database_url
        
    def get_connection(self):
        """데이터베이스 연결"""
        try:
            return psycopg2.connect(self.database_url)
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            return None
    
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
    
    def convert_age_to_int(self, age_str: str) -> int:
        """연령대 문자열을 정수로 변환 (예: '50대' -> 50)"""
        try:
            if age_str.endswith('대'):
                return int(age_str[:-1])
            return int(age_str)
        except:
            return 30  # 기본값
    
    def save_to_database(self, item: Dict[str, Any]) -> bool:
        """데이터베이스에 직접 저장"""
        conn = self.get_connection()
        if not conn:
            return False
        
        try:
            cursor = conn.cursor()
            
            # 데이터 변환
            source_id = item.get("source_id", "")
            consulting_date = datetime.strptime(item.get("consulting_date", "2025-09-07"), "%Y-%m-%d")
            consulting_time = datetime.strptime(item.get("consulting_time", "12:00"), "%H:%M")
            client_gender = item.get("client_gender", "남자")
            client_age = self.convert_age_to_int(item.get("client_age", "30대"))
            consulting_turns = int(item.get("consulting_turns", 0))
            consulting_length = int(item.get("consulting_length", 0))
            consulting_content = item.get("consulting_content", "")
            
            # 현재 시간
            now = datetime.now()
            
            # INSERT 쿼리 (created_at, updated_at 포함)
            insert_query = """
                INSERT INTO voc_raw (
                    source_id, consulting_date, client_gender, client_age,
                    consulting_turns, consulting_length, consulting_content, consulting_time,
                    created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source_id) DO NOTHING
            """
            
            cursor.execute(insert_query, (
                source_id, consulting_date, client_gender, client_age,
                consulting_turns, consulting_length, consulting_content, consulting_time,
                now, now
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"❌ 데이터베이스 저장 실패: {e}")
            if conn:
                conn.rollback()
                conn.close()
            return False
    
    def load_voc_data(self, max_files: int = None, delay: float = 0.1):
        """VocRaw 데이터 적재"""
        print("🚀 VocRaw 테이블 직접 데이터 적재 시작")
        
        # 데이터베이스 연결 테스트
        conn = self.get_connection()
        if not conn:
            print("❌ 데이터베이스에 연결할 수 없습니다. Docker 서비스가 실행 중인지 확인해주세요.")
            return
        
        conn.close()
        print("✅ 데이터베이스 연결 성공")
        
        # 데이터 디렉토리 경로
        data_dir = Path("data")
        
        if not data_dir.exists():
            print(f"❌ 디렉토리를 찾을 수 없습니다: {data_dir}")
            return
        
        # JSON 파일 목록 수집
        json_files = [f for f in data_dir.glob("*.json")]
        
        if max_files:
            json_files = json_files[:max_files]
        
        total_files = len(json_files)
        print(f"📁 총 {total_files}개의 JSON 파일 발견")
        
        if total_files == 0:
            print("❌ JSON 파일을 찾을 수 없습니다.")
            return
        
        success_count = 0
        error_count = 0
        total_records = 0
        
        print(f"\n�� 데이터 적재 시작...")
        
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
                # 데이터베이스에 저장
                if self.save_to_database(item):
                    file_success += 1
                    total_records += 1
                    print(f"   ✅ {item.get('source_id', 'Unknown')} 저장 완료")
                else:
                    file_error += 1
                    print(f"   ❌ {item.get('source_id', 'Unknown')} 저장 실패")
                
                # 부하 방지를 위한 지연
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
                print(f"\n�� 전체 진행률: {i}/{total_files} ({i/total_files*100:.1f}%)")
                print(f"   성공한 파일: {success_count}개")
                print(f"   실패한 파일: {error_count}개")
                print(f"   총 적재된 레코드: {total_records}개")
        
        print(f"\n🎉 데이터 적재 완료!")
        print(f"   성공한 파일: {success_count}개")
        print(f"   실패한 파일: {error_count}개")
        print(f"   총 적재된 레코드: {total_records}개")
        
        # 적재 결과 확인
        self.check_loaded_data()
    
    def check_loaded_data(self):
        """적재된 데이터 확인"""
        conn = self.get_connection()
        if not conn:
            return
        
        try:
            cursor = conn.cursor()
            
            # 총 레코드 수 확인
            cursor.execute("SELECT COUNT(*) FROM voc_raw")
            count = cursor.fetchone()[0]
            print(f"\n📈 데이터베이스에 저장된 총 레코드 수: {count}개")
            
            # 최근 5개 레코드 표시
            cursor.execute("""
                SELECT source_id, client_gender, client_age, consulting_turns 
                FROM voc_raw 
                ORDER BY created_at DESC 
                LIMIT 5
            """)
            
            recent_records = cursor.fetchall()
            if recent_records:
                print(f"\n📋 최근 저장된 상담:")
                for record in recent_records:
                    source_id, gender, age, turns = record
                    print(f"   {source_id}: {gender}, {age}세, {turns}턴")
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            print(f"⚠️  적재 결과 확인 실패: {e}")
            if conn:
                conn.close()

def main():
    """메인 실행 함수"""
    import argparse
    
    parser = argparse.ArgumentParser(description="VocRaw 테이블 직접 데이터 적재")
    parser.add_argument("--max-files", type=int, help="처리할 최대 파일 수 (테스트용)")
    parser.add_argument("--delay", type=float, default=0.1, help="저장 간 지연 시간 (초)")
    parser.add_argument("--db-url", default="postgresql://voicebot_user:voicebot_password@localhost:5433/voicebot_db", help="데이터베이스 URL")
    
    args = parser.parse_args()
    
    loader = VocDataLoader(args.db_url)
    loader.load_voc_data(max_files=args.max_files, delay=args.delay)

if __name__ == "__main__":
    main()
