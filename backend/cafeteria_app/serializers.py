from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, Category, Product, TimeSlot, Order, OrderItem, Favorite


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role']

    def get_role(self, obj):
        try:
            return obj.profile.role
        except UserProfile.DoesNotExist:
            return 'alumno'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'emoji']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'name', 'price', 'category', 'category_name', 'emoji', 'healthy', 'stock', 'available']

    def get_category_name(self, obj):
        return obj.category.name if obj.category else ''


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ['id', 'label', 'start', 'end']


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_emoji = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_emoji', 'quantity', 'price']

    def get_product_name(self, obj):
        return obj.product.name if obj.product else 'Producto eliminado'

    def get_product_emoji(self, obj):
        return obj.product.emoji if obj.product else '🍽️'


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    time_slot_label = serializers.SerializerMethodField()
    user_username = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'code', 'status', 'time_slot', 'time_slot_label', 'total', 'created_at', 'items', 'user_username']

    def get_time_slot_label(self, obj):
        return obj.time_slot.label if obj.time_slot else ''

    def get_user_username(self, obj):
        return obj.user.username


class FavoriteSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'product']
