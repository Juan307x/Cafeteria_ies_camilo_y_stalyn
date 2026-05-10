from django.urls import path
from . import views

urlpatterns = [
    path('auth/login/', views.login_view),
    path('auth/logout/', views.logout_view),
    path('auth/me/', views.me_view),
    path('products/', views.products_list),
    path('products/<int:pk>/stock/', views.update_stock),
    path('categories/', views.categories_list),
    path('timeslots/', views.timeslots_list),
    path('orders/', views.orders_list),
    path('orders/<int:pk>/', views.order_detail),
    path('favorites/', views.favorites_list),
    path('favorites/<int:pk>/toggle/', views.toggle_favorite),
]
