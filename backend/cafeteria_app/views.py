import random
import string
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import UserProfile, Category, Product, TimeSlot, Order, OrderItem, Favorite
from .serializers import (
    UserSerializer, CategorySerializer, ProductSerializer,
    TimeSlotSerializer, OrderSerializer, FavoriteSerializer
)


def generate_code():
    return '#' + ''.join(random.choices(string.digits, k=6))


# ─── AUTH ─────────────────────────────────────────────────────────────────

@csrf_exempt
@api_view(['POST'])
def login_view(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    user = authenticate(request, username=username, password=password)
    if not user:
        return Response({'error': 'Usuario o contraseña incorrectos'}, status=401)
    login(request, user)
    return Response(UserSerializer(user).data)


@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'ok': True})


@api_view(['GET'])
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'error': 'No autenticado'}, status=401)
    return Response(UserSerializer(request.user).data)


# ─── PRODUCTS ─────────────────────────────────────────────────────────────

@api_view(['GET'])
def products_list(request):
    products = Product.objects.filter(available=True).select_related('category')
    return Response(ProductSerializer(products, many=True).data)


@api_view(['POST'])
def update_stock(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    stock = request.data.get('stock', 0)
    product.stock = max(0, int(stock))
    product.save()
    return Response(ProductSerializer(product).data)


# ─── CATEGORIES ───────────────────────────────────────────────────────────

@api_view(['GET'])
def categories_list(request):
    cats = Category.objects.all()
    return Response(CategorySerializer(cats, many=True).data)


# ─── TIMESLOTS ────────────────────────────────────────────────────────────

@api_view(['GET'])
def timeslots_list(request):
    slots = TimeSlot.objects.all()
    return Response(TimeSlotSerializer(slots, many=True).data)


# ─── ORDERS ───────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def orders_list(request):
    if request.method == 'GET':
        user = request.user
        if not user.is_authenticated:
            return Response([], status=200)
        try:
            role = user.profile.role
        except UserProfile.DoesNotExist:
            role = 'alumno'
        if role == 'admin':
            orders = Order.objects.all().prefetch_related('items__product').select_related('time_slot', 'user').order_by('-created_at')
        else:
            orders = Order.objects.filter(user=user).prefetch_related('items__product').select_related('time_slot').order_by('-created_at')
        return Response(OrderSerializer(orders, many=True).data)

    # POST — crear pedido
    if not request.user.is_authenticated:
        return Response({'error': 'Debes iniciar sesión'}, status=401)

    time_slot_id = request.data.get('time_slot_id')
    items_data = request.data.get('items', [])

    if not time_slot_id or not items_data:
        return Response({'error': 'Faltan datos (franja horaria o artículos)'}, status=400)

    try:
        slot = TimeSlot.objects.get(pk=time_slot_id)
    except TimeSlot.DoesNotExist:
        return Response({'error': 'Franja horaria no válida'}, status=400)

    order = Order.objects.create(
        user=request.user,
        code=generate_code(),
        time_slot=slot,
        status='pending',
    )

    total = 0
    for item in items_data:
        try:
            product = Product.objects.get(pk=item['product_id'])
        except Product.DoesNotExist:
            continue
        qty = int(item.get('quantity', 1))
        OrderItem.objects.create(order=order, product=product, quantity=qty, price=product.price)
        total += product.price * qty
        # Descontar stock
        product.stock = max(0, product.stock - qty)
        product.save()

    order.total = total
    order.save()
    return Response(OrderSerializer(order).data, status=201)


@api_view(['PATCH'])
def order_detail(request, pk):
    try:
        order = Order.objects.get(pk=pk)
    except Order.DoesNotExist:
        return Response({'error': 'Pedido no encontrado'}, status=404)
    new_status = request.data.get('status')
    if new_status:
        order.status = new_status
        order.save()
    return Response(OrderSerializer(order).data)


# ─── FAVORITES ────────────────────────────────────────────────────────────

@api_view(['GET'])
def favorites_list(request):
    if not request.user.is_authenticated:
        return Response([])
    favs = Favorite.objects.filter(user=request.user).select_related('product')
    return Response(FavoriteSerializer(favs, many=True).data)


@api_view(['POST'])
def toggle_favorite(request, pk):
    if not request.user.is_authenticated:
        return Response({'error': 'No autenticado'}, status=401)
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Producto no encontrado'}, status=404)
    fav, created = Favorite.objects.get_or_create(user=request.user, product=product)
    if not created:
        fav.delete()
        return Response({'favorited': False})
    return Response({'favorited': True})
