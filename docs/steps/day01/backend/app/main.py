from fastapi import FastAPI

# FastAPI 앱 객체 : 모든 API 를 여기에 붙인다
app = FastAPI(title="음료 쇼핑몰")


# @app.get("/") : "GET 방식으로 / 주소를 요청하면 아래 함수를 실행하라"
@app.get("/")
def root():
    return {"message": "서버가 실행중입니다"}
