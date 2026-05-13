# Список продуктов

### Get Products

Endpoint: `GET /v2/products`

Параметры запроса

Метод возвращает список продуктов. Если указать параметр `last_updated_date` - метод вернет только те продукты, которые были изменены после даты `last_updated_date`(в **UTC**). Также есть опциональные параметры `page` и `limit`  для разбиения по страницам. 

| Имя | Тип | Описание |
| --- | --- | --- |
| limit | int | Количество элементов на страницу. По умолчанию возвращаются 100 записей на страницу |
| page | int | Номер страницы |
| last_updated_date | string | Время последней синхронизации. Передается в формате `2022-05-14 00:00:00`. Смещение - **UTC** |
| search | string | Строка поиска |

<aside>
⚠️

Внимание! 

Параметр **last_updated_date** принимает дату и время по **UTC**

</aside>

Пример запроса

```bash
curl -X 'GET' \
  'https://api-admin.billz.ai/v2/products?limit=5&search=Nike' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer ..'
```

Параметры ответа

| Имя | Тип | Описание |
| --- | --- | --- |
| count | int | Количество товаров |
| products | []object | Список товаров |
| products[].id | string | ИД товара |
| products[].name | string | Наименование товара |
| products[].barcode | string | Баркод товара |
| products[].sku | string | Артикул товара |
| products[].brand_id | string | ИД бренда |
| products[].brand_name | string | Название бренда |
| products[].description | string | Описание товара |
| products[].is_variative | bool | Является ли товар вариативным |
| products[].main_image_url | string | Ссылка на главную фотографию товара |
| products[].categories | []object | Список категории товара |
| products[].categories[].id | string | ИД категории |
| products[].categories[].name | string | Название категории |
| products[].categories[].parent_id | string | ИД родительской категории |
| products[].custom_fields | []object | Список кастомных характеристик товара |
| products[].custom_fields[].cusom_field_id | string | ИД кастомной характеристики |
| products[].custom_fields[].cusom_field_name | string | Значение кастомной харакетристики |
| products[].measurement_unit | object | Единица измерения  |
| products[].measurement_unit.id | string | ИД единицы измерения |
| products[].measurement_unit.name | string | Название единицы измерения. Пример: штука |
| products[].measurement_unit.short_name | string | Короткое название единицы измерения. Пример: шт |
| parent_id | string | ИД родителя товара (используется в вариациях) |
| products[].photos[].photo_url | []object | Массив ссылок на фотографии товара |
| products[].photos[].sequence | []object | Порядок отображения в массиве |
| products[].photos[].is_main | []object | Признак главной фотографии |
| products[].product_attributes[] | []object | Атрибуты вариации товара |
| products[].product_attributes[].attribute_id | string | ИД атрибута |
| products[].product_attributes[].attribute_value_id | string | ИД значения аттрибута |
| products[].product_attributes[].attribute_value | string | Значение атрибута |
| products[].product_attributes[].attribute_name | string | Название аттрибута |
| products[].product_type_id | string | ИД типа товара. Значения:
`69e939aa-9b8f-46a9-b605-8b2675475b7b` - простой товар
`5a0e556a-15f8-47ac-ae07-46972f3c6ab4` - сервис
`864c77c7-5407-45dc-8289-3162b71dc653` - комплект  |
| products[].shop_measurement_values | []object | Остатки товаров в разбивке по точкам |
| products[].shop_measurement_values[].shop_id | string | ИД точки |
| products[].shop_measurement_values[].shop_name | string | Название точки |
| products[].shop_measurement_values[].active_measurement_value | string | Остаток товаров в данной точке |
| products[].shop_prices | []object | Цены товаров в разбивке по точкам |
| products[].shop_prices[].shop_id | string | ИД точки |
| products[].shop_prices[].shop_name | string | Название точки |
| products[].shop_prices[].retail_price | float | Цена продажи товара |
| products[].shop_prices[].retail_currency | string | Валюта цены продажи |
| products[].shop_prices[].promo_price | float | Цена с учетом скидки по умолчанию 0, значение использовать только в случае если поле promos заполнено |
| products[].shop_prices[].promos | []object | Детали акций применяемых к товары для получения наименьшей скидки |
| products[].shop_prices[].promos[].id | string | внутренний id акции |
| products[].shop_prices[].promos[].external_id | string | id отображаемый пользователю |
| products[].shop_prices[].promos[].discount_type | string | тип скидки “PERCENTAGE” - процент скидки, “FIXED PRICE” - скидочная цена |
| products[].shop_prices[].promos[].discount_value | float | значение скидки, в случае с PERCENTAGE будет процент скидки, в случае FIXED PRICE будет скидочная цена |
| products[].shop_prices[].promos[].name | string | название акции |
| products[].shop_prices[].supply_currency | string | Валюта цены поставки |
| products[].shop_prices[].supply_price | float | Цена поставки товара |
| products[].updated_at | string | Дата последнего обновления товара в формате `2022-05-14 00:00:00` |
|  |  |  |

Пример ответа

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "name": "Air Jordan 1 High",
  "barcode": "978020137962",
  "sku": "THY-1232",
  "brand_id": "00000000-0000-0000-0000-000000000000",
  "brand_name": "Nike",
  "description": "Description of this product",
  "is_variative": true,
  "main_image_url": "",
  "categories": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "name": "Обувь",
      "parent_id": ""
    }
  ],
  "custom_fields": [
    {
      "custom_field_id": "00000000-0000-0000-0000-000000000000",
      "custom_field_value": "XL"
    }
  ],
  "measurement_unit": {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Штука",
    "short_name": "шт"
  },
  "parent_id": "",
  "product_attributes": [
    {
      "attribute_id": "00000000-0000-0000-0000-000000000000",
      "attribute_value": "Красный",
      "attribute_value_id": "00000000-0000-0000-0000-000000000000"
    }
  ],
  "product_type_id": "69e939aa-9b8f-46a9-b605-8b2675475b7b",
  "shop_measurement_values": [
    {
      "active_measurement_value": 5,
      "shop_id": "00000000-0000-0000-0000-000000000000",
      "shop_name": "Nike Store"
    }
  ],
  "shop_prices": [
    {
      "retail_currency": "UZS",
      "retail_price": 1000000,
      "shop_id": "00000000-0000-0000-0000-000000000000",
			"shop_name": "Nike Store",
			"promo_price": 500000,
			"promos": [
				{
            "id": "12602df0-3e7a-42a8-9acf-017737cf1e99",
            "external_id": "487620",
            "name": "discount 50%",
            "discount_value": 50,
            "discount_type": "PERCENTAGE"
        },
       "supply_currency": "UZS",
       "supply_price": 20000
			]
    }
  ],
  "updated_at": "2022-01-01 00:00:00",
  "suppliers": [
		{
			"id": "d8c70e9f-15c7-4019-989f-121b15d07593",
			"company_id": "",
			"name": "Xazars"
		},
		{
			"id": "eee9dc22-468a-470c-aea3-5a7c01730894",
			"company_id": "",
			"name": "123"
		}
	],
	"product_supplier_stock": [
		{
			"supplier_id": "00000000-0000-0000-0000-000000000000",
			"supplier_name": "",
			"shop_id": "7001a655-d008-438d-aff4-4cc334f03941",
			"measurement_value": 10,
			"min_supply_price": 2,
			"max_supply_price": 10,
			"retail_price": 20000,
			"wholesale_price": 0
		},
		{
			"supplier_id": "d8c70e9f-15c7-4019-989f-121b15d07593",
			"supplier_name": "Xazars",
			"shop_id": "7001a655-d008-438d-aff4-4cc334f03941",
			"measurement_value": 2,
			"min_supply_price": 2,
			"max_supply_price": 3,
			"retail_price": 20000,
			"wholesale_price": 0
		},
		{
			"supplier_id": "eee9dc22-468a-470c-aea3-5a7c01730894",
			"supplier_name": "123",
			"shop_id": "7001a655-d008-438d-aff4-4cc334f03941",
			"measurement_value": 1,
			"min_supply_price": 4,
			"max_supply_price": 4,
			"retail_price": 20000,
			"wholesale_price": 0
		}
	]
}
```