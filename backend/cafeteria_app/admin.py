from django.contrib import admin
from .models import UserProfile, Category, Product, TimeSlot, Order, OrderItem, Favorite

admin.site.register(UserProfile)
admin.site.register(Category)
admin.site.register(Product)
admin.site.register(TimeSlot)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Favorite)
