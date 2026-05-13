# Список продаж

Список продаж можно получить и отфильтровать используя метод v3/order-search

Если у вас есть только ID продажи, клиент или пользователь, то можно воспользоваться только поиском через параметр **search**

**Входящие параметры**

| **Параметр** | **Описание** |
| --- | --- |
| search | поиск по ID продажи, клиенту или пользователя |
| company_payment_type_ids | ID типов платежей через запятую |
| start | Завершение продажи от  |
| end_date | Завершение продажи до  |
| limit | Количество записей на странице |
| page | Номер страницы |
| seller_id | ID продавца |
| shop_ids | ID магазинов, через запятую |
| start_total_price | Сумма чека от |
| end_total_price | Сумма чека до |
| user_id | ID Кассира |
| cashbox_id | список ID кассы |
| shift_id | список ID смены |

**пример запроса**

```bash
curl  -X 'GET' \
'https://api-admin.billz.ai/v3/order-search?company_id=17a36439-d140-454d-aedb-ae1585681db1&company_payment_type_ids=c6e84d9b-0ef0-4d5a-886d-147c74a9b051&start_date=2024-12-01&end_date=2024-12-31&end_total_price=1000000000&limit=10&page=1&seller_id=fce950da-654c-43d7-ae5f-eeb84a891a6a&shop_ids=6f244db4-75d6-4fac-9841-14867d45e36a&start_total_price=1&user_id=fce950da-654c-43d7-ae5f-eeb84a891a6a&cashbox_id=1289848d-bf9f-4521-8d3f-851196541aae&shift_id=5
```

**Модель ответа**

Ответ включает в себя список продаж, сгруппированных по дате продаже

| **Поле** | **Описание** |
| --- | --- |
| count | Количество записей |
| orders_sorted_by_date_list[] | список дат продаж |
| orders_sorted_by_date_list.date | Дата продажи |
| [orders_sorted_by_date_list.orders](http://orders_sorted_by_date_list.orders.id/)[] | список продаж за дату |
| [].order[].id | Идентификатор продажи |
| [].orders[].parent_id | Идентификатор родительской продажи (при возврате) |
| [].orders[].company_id | Идентификатор компании |
| [].orders[].order_number | Номер продажи |
| [].orders[].order_status | Статус продажи |
| [].orders[].order_detail.customer.id | Идентификатор клиента |
| [].orders[].order_detail.customer.name | Имя клиента |
| [].orders[].order_detail.user.id | Идентификатор кассира |
| [].orders[].order_detail.user.name | Имя кассира |
| [].orders[].order_detail.cashbox_name | Название кассы |
| [].orders[].order_detail.cashbox_id | Идентификатор кассы |
| [].orders[].order_detail.cashbox_history_id | Идентификатор истории кассы |
| [].orders[].order_detail.shift_id | Идентификатор смены |
| [].orders[].order_detail.shop_id | Идентификатор магазина |
| [].orders[].order_detail.shop.name | Название магазина |
| [].orders[].order_detail.total_price | Общая цена продажи |
| [].orders[].order_detail.has_discount | Индикатор наличия скидки |
| [].orders[].order_detail.total_products_measurement_value | Общее количество продуктов в продаже |
| [].orders[].order_detail.total_sets_measurement_value | Общее количество наборов в продаже |
| [].orders[].order_detail.total_services_measurement_value | Общее количество услуг в продаже |
| [].orders[].order_detail.total_returned_measurement_value | Общее количество возвращенных товаров в продаже |
| [].orders[].order_detail.comment | Комментарий к продаже |
| [].orders[].order_detail.with_cashback | Сумма кэшбэка |
| [].orders[].order_detail.returned_cashback | Возвращенный кэшбэк |
| [].orders[].order_detail.loyalty_balance_income | Доход по балансу лояльности |
| [].orders[].order_detail.loyalty_balance_outcome | Расход по балансу лояльности |
| [].orders[].order_detail.loyalty_payment | Платеж по лояльности |
| [].orders[].order_detail.not_loyalty_payment | Платеж без лояльности |
| [].orders[].order_detail.gift_card_payment | Платеж подарочной картой |
| [].orders[].order_detail.is_authorized | Индикатор авторизации |
| [].orders[].order_detail.has_certificate | Индикатор наличия сертификата |
| [].orders[].order_detail.has_voucher | Индикатор наличия ваучера |
| [].orders[].order_detail.promo_codes | Промо-коды |
| [].orders[].order_detail.without_cashback | Индикатор отсутствия кэшбэка |
| [].orders[].order_type | Тип продажи |
| [].orders[].created_at | Дата создания продажи |
| [].orders[].created_at_utc | Дата создания продажи в формате UTC |
| [].orders[].future_time | Будущее время продажи (для отложек) |
| [].orders[].debt | Долг по продаже |
| [].orders[].customer_id | Идентификатор клиента |
| [].orders[].parent_order_debt | Долг родительского заказа |
| [].orders[].deleted | Индикатор удаления заказа |
| [].orders[].webkassa_log_qty | Количество логов Webkassa |
| [].orders[].epos_log_qty | Количество логов ЭПОС |
| [].orders[].finished_at | Фактическая дата завершения продажи |
| [].orders[].display_finished_at | Отображаемая фактическая дата завершения продажи |
| [].orders[].sold_at | Дата продажи (может быть отредактирована) |
| [].orders[].display_sold_at | Отображаемая дата продажи (может быть отредактирована) |
| [].orders[].order_debt_payments | Платежи по долгу заказа |
| [].orders[].park_status | Статус отложки |
| [].orders[].exchange_disabled | Индикатор отключения обмена |
| [].orders[].total_remaining_debt_in_chain | Общий оставшийся долг |
| [].orders[].updated_at | Дата обновления продажи |

пример ответа

```json
{
    "count": 2,
    "orders_sorted_by_date_list": [
        {
            "date": "2024-12-31",
            "orders": [
                {
                    "id": "5143d881-9ac2-4c83-b494-8b4b67fc50e4",
                    "parent_id": "",
                    "company_id": "",
                    "order_number": "2089635259",
                    "order_status": "",
                    "order_detail": {
                        "customer": {},
                        "user": {
                            "id": "90219ac7-88b7-43f6-bed9-5c6761aefa71",
                            "name": "v z",
                            "first_name": "",
                            "last_name": ""
                        },
                        "cashbox_name": "Cashbox vadim-test-2",
                        "cashbox_id": "667404e3-baec-4c03-a052-c6232994cf06",
                        "cashbox_history_id": "",
                        "shift_id": 0,
                        "shop_id": "803b542d-51e5-41ea-9124-51f248536286",
                        "shop": {
                            "id": "",
                            "name": "Store vadim-test-2"
                        },
                        "total_price": 285000,
                        "has_discount": false,
                        "total_products_measurement_value": 0,
                        "total_sets_measurement_value": 2,
                        "total_services_measurement_value": 0,
                        "total_returned_measurement_value": 0,
                        "comment": "",
                        "created_at": "2024-12-31 01:14:27",
                        "created_at_utc": "",
                        "with_cashback": 0,
                        "returned_cashback": 0,
                        "loyalty_balance_income": 0,
                        "loyalty_balance_outcome": 0,
                        "loyalty_payment": 0,
                        "not_loyalty_payment": 0,
                        "gift_card_payment": 0,
                        "is_authorized": false,
                        "has_certificate": false,
                        "has_voucher": false,
                        "promo_codes": null,
                        "without_cashback": false,
                        "user_has_auth_role": false,
                        "offline_order_validation_status": 0
                    },
                    "order_type": "SALE",
                    "created_at": "",
                    "deleted_at": 0,
                    "created_at_utc": "",
                    "future_time": "",
                    "debt": null,
                    "customer_id": "",
                    "parent_order_debt": null,
                    "deleted": false,
                    "webkassa_log_qty": 0,
                    "epos_log_qty": 0,
                    "finished_at": "2024-12-30T21:39:26.089332Z",
                    "display_finished_at": "2024-12-31 02:39:26",
                    "sold_at": "2024-12-30T21:39:26Z",
                    "display_sold_at": "2024-12-31 02:39:26",
                    "order_debt_payments": null,
                    "park_status": "",
                    "exchange_disabled": false,
                    "total_remaining_debt_in_chain": 0,
                    "updated_at": "",
                    "has_insurance": false,
                    "insurance": null
                }
         },       
        {
            "date": "2024-12-10",
            "orders": [
                {
                    "id": "636d7c95-1a94-40a2-b40f-1bef69a4176c",
                    "parent_id": "",
                    "company_id": "",
                    "order_number": "817183",
                    "order_status": "",
                    "order_detail": {
                        "customer": {},
                        "user": {
                            "id": "90219ac7-88b7-43f6-bed9-5c6761aefa71",
                            "name": "v z",
                            "first_name": "",
                            "last_name": ""
                        },
                        "cashbox_name": "Cashbox vadim-test-2",
                        "cashbox_id": "667404e3-baec-4c03-a052-c6232994cf06",
                        "cashbox_history_id": "",
                        "shift_id": 0,
                        "shop_id": "803b542d-51e5-41ea-9124-51f248536286",
                        "shop": {
                            "id": "",
                            "name": "Store vadim-test-2"
                        },
                        "total_price": 65000,
                        "has_discount": false,
                        "total_products_measurement_value": 0,
                        "total_sets_measurement_value": 1,
                        "total_services_measurement_value": 0,
                        "total_returned_measurement_value": 0,
                        "comment": "",
                        "created_at": "2024-12-10 13:00:01",
                        "created_at_utc": "",
                        "with_cashback": 0,
                        "returned_cashback": 0,
                        "loyalty_balance_income": 0,
                        "loyalty_balance_outcome": 0,
                        "loyalty_payment": 0,
                        "not_loyalty_payment": 0,
                        "gift_card_payment": 0,
                        "is_authorized": false,
                        "has_certificate": false,
                        "has_voucher": false,
                        "promo_codes": null,
                        "without_cashback": false,
                        "user_has_auth_role": false,
                        "offline_order_validation_status": 0
                    },
                    "order_type": "SALE",
                    "created_at": "",
                    "deleted_at": 0,
                    "created_at_utc": "",
                    "future_time": "",
                    "debt": null,
                    "customer_id": "",
                    "parent_order_debt": null,
                    "deleted": false,
                    "webkassa_log_qty": 0,
                    "epos_log_qty": 0,
                    "finished_at": "2024-12-10T08:00:36.136505Z",
                    "display_finished_at": "2024-12-10 13:00:36",
                    "sold_at": "2024-12-10T08:00:36Z",
                    "display_sold_at": "2024-12-10 13:00:36",
                    "order_debt_payments": null,
                    "park_status": "",
                    "exchange_disabled": false,
                    "total_remaining_debt_in_chain": 0,
                    "updated_at": "",
                    "has_insurance": false,
                    "insurance": null
                }
            ]
        }
    ]
}
```