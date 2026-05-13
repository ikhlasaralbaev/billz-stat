# **Аутентификация**

BILLZ 2.0 API использует JSON Web Token ([**JWT**](https://jwt.io/)) для проверки аутентификации. Токен генерируется на стороне сервера со сроком 15 дней. 

### Получение токена

Для получения jwt токена нужно отправить POST запрос на  https://api-admin.billz.ai/v1/auth/login с секретным ключом в теле запроса. Полученный access_token нужно передавать в заголовке каждого запроса в формате `Authorization: Bearer your_access_token`

*Секретный ключ можно создать в BILLZ UI*

[Как создать ключ интеграции](https://www.notion.so/277d21b66e6a80febe59db37724cefa0?pvs=21)

Пример запроса

```bash
curl -X 'POST' \
  'https://api-admin.billz.ai/v1/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "secret_token": "YOUR_SECRET_KEY"
}'
```

Пример ответа

```json
{
	"code": 200,
	"message": "ok",
	"error": null,
	"data": {
		"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
		"refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
		"token_type": "Bearer",
		"expires_in": 86400
	}
}
```

BILLZ 2.0 API использует JSON Web Token ([**JWT**](https://jwt.io/)) для проверки аутентификации. Токен генерируется на стороне сервера со сроком 15 дней. 

Если  выполнить запрос с просроченным токеном, то вернётся ответ с 401 кодом и текстом ошибки

```bash
 HTTP/2 401
 {
	"code": 401,
	"message": "token error",
	"error": "Token is expired",
	"data": null
}
```

В этом случае можно просто повторно выпустить токен