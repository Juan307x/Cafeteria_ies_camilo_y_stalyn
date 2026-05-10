from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    ROLES = [('admin', 'Admin'), ('alumno', 'Alumno')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=10, choices=ROLES, default='alumno')

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Category(models.Model):
    name = models.CharField(max_length=50)
    emoji = models.CharField(max_length=5, default='🍽️')

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=5, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    emoji = models.CharField(max_length=5, default='🍽️')
    healthy = models.BooleanField(default=False)
    stock = models.IntegerField(default=20)
    available = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class TimeSlot(models.Model):
    label = models.CharField(max_length=30)
    start = models.TimeField()
    end = models.TimeField()

    def __str__(self):
        return self.label


class Order(models.Model):
    STATUSES = [
        ('pending', 'Pendiente'),
        ('paid', 'Pagado'),
        ('ready', 'Listo'),
        ('delivered', 'Entregado'),
        ('cancelled', 'Cancelado'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    code = models.CharField(max_length=10, unique=True)
    status = models.CharField(max_length=15, choices=STATUSES, default='pending')
    time_slot = models.ForeignKey(TimeSlot, on_delete=models.SET_NULL, null=True)
    total = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.product}"


class Favorite(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'product')
