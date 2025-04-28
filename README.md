# FunnelSync Backend

Бэкенд часть проекта FunnelSync - агрегатора социальных сетей для управления коммуникацией с клиентами.

## 🛠 Технологический стек

- NestJS
- MongoDB
- Socket.IO
- Telegram Bot API
- JWT аутентификация

## 📦 Установка и запуск

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл `.env` в корне проекта со следующими переменными:
```
MONGODB_URI=mongodb://localhost:27017/funnelsync
JWT_SECRET=your-secret-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

3. Запустите приложение:
```bash
npm run start:dev
```

## 📚 API Документация

### Аутентификация

#### Регистрация
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```
**Описание:** Регистрирует нового пользователя.  
**Входные данные:**  
- `email` (string): Email пользователя (должен быть уникальным).  
- `password` (string): Пароль пользователя.  
- `name` (string): Имя пользователя.  
**Возвращает:** Объект с данными пользователя (без пароля).  
**Ошибки:**  
- 400 Bad Request: "Пользователь с таким email уже существует".

#### Вход
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```
**Описание:** Аутентифицирует пользователя и возвращает JWT-токен.  
**Входные данные:**  
- `email` (string): Email пользователя.  
- `password` (string): Пароль пользователя.  
**Возвращает:** Объект с полями `access_token` (JWT-токен) и `user` (данные пользователя).  
**Ошибки:**  
- 401 Unauthorized: "Invalid credentials".

### Telegram

#### Подключение аккаунта Telegram
```http
POST /telegram/connect
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "accessToken": "your-telegram-bot-token"
}
```
**Описание:** Подключает Telegram-бота к профилю пользователя.  
**Входные данные:**  
- `accessToken` (string): Токен Telegram-бота, полученный от BotFather.  
**Возвращает:** Объект с полем `success: true` и данными бота (`botInfo`).  
**Ошибки:**  
- 400 Bad Request: "This Telegram bot is already connected and active" или другие ошибки подключения.

#### Получение подключенных аккаунтов
```http
GET /telegram/accounts
Authorization: Bearer <jwt-token>
```
**Описание:** Возвращает список всех подключенных Telegram-каналов пользователя.  
**Возвращает:** Массив объектов с данными каналов (id, username, firstName, lastName, isActive, lastSync).  
**Ошибки:**  
- 404 Not Found: "User not found".

#### Отключение Telegram-бота
```http
POST /telegram/disconnect/:channelId
Authorization: Bearer <jwt-token>
```
**Описание:** Останавливает работу Telegram-бота, но не удаляет канал из профиля пользователя.  
**Параметры:**  
- `channelId` (string): Идентификатор канала.  
**Возвращает:** Объект с полем `success: true`.  
**Ошибки:**  
- 404 Not Found: "Bot is not running for this user".

#### Удаление Telegram-канала
```http
POST /telegram/delete/:channelId
Authorization: Bearer <jwt-token>
```
**Описание:** Полностью удаляет Telegram-канал из профиля пользователя.  
**Параметры:**  
- `channelId` (string): Идентификатор канала.  
**Возвращает:** Объект с полем `success: true`.  
**Ошибки:**  
- 404 Not Found: "Telegram channel not found".

#### Запуск сохранённого Telegram-канала
```http
POST /telegram/start/:channelId
Authorization: Bearer <jwt-token>
```
**Описание:** Запускает ранее остановленный Telegram-канал.  
**Параметры:**  
- `channelId` (string): Идентификатор канала.  
**Возвращает:** Объект с полем `success: true`.  
**Ошибки:**  
- 404 Not Found: "Telegram channel not found or accessToken missing".
- 400 Bad Request: "Bot is already running for this user".

#### Отправка сообщения в Telegram
```http
POST /telegram/send-message
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "chatId": "123456789",
  "message": "Hello, world!"
}
```
**Описание:** Отправляет сообщение через активный Telegram-бот пользователя.  
**Входные данные:**  
- `chatId` (string): Идентификатор чата в Telegram.  
- `message` (string): Текст сообщения.  
**Возвращает:** Объект с полем `success: true`.  
**Ошибки:**  
- 404 Not Found: "No active Telegram channel found".
- 400 Bad Request: "Failed to send message".

### WebSocket API

#### Подключение к WebSocket
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```
**Описание:** Устанавливает WebSocket-соединение с сервером.  
**События WebSocket:**

1. **Получение непрочитанных сообщений:**
   ```javascript
   socket.on('unreadMessages', (messages) => {
     console.log('Unread messages:', messages);
   });
   ```

2. **Получение истории чата:**
   ```javascript
   socket.on('chatHistory', (history) => {
     console.log('Chat history:', history);
   });
   ```

3. **Получение новых сообщений:**
   ```javascript
   socket.on('newMessage', (msg) => {
     console.log('New message:', msg);
   });
   ```

## 📝 Дополнительная информация

- При перезапуске сервера все активные Telegram-боты автоматически восстанавливаются.
- Если бот не удаётся запустить, его статус (`isActive`) автоматически меняется на `false`.
- Все ошибки возвращаются с соответствующими HTTP-статусами и понятными сообщениями.

## 🏗 Структура проекта

```
src/
├── auth/              # Модуль аутентификации
│   ├── dto/          # Data Transfer Objects
│   ├── guards/       # JWT Guard
│   ├── strategies/   # JWT Strategy
│   └── ...
├── chat/             # Модуль чата
│   ├── schemas/      # Схемы MongoDB
│   └── ...
├── common/           # Общие модули
├── telegram/         # Модуль Telegram
│   ├── schemas/      # Схемы MongoDB
│   └── ...
└── users/            # Модуль пользователей
    ├── schemas/      # Схемы MongoDB
    └── ...
```

## 🔐 Безопасность

- JWT аутентификация
- Хеширование паролей с использованием bcrypt
- Валидация входящих данных
- Защита WebSocket соединений

## 📝 Лицензия

`be_v0.1` исходный код лицензирован на условиях лицензии Boost Software. Дополнительную информацию смотрите в разделе [LICENSE_1_0.txt](http://www.boost.org/LICENSE_1_0.txt)
