# backend/apps/ingestion/urls.py

from django.urls import path
from .views import SAPUploadView, UtilityUploadView, TravelImportView
from apps.ingestion.serializers import NormalizedRecordListSerializer

urlpatterns = [
    path("upload/sap/", SAPUploadView.as_view()),
    path("upload/utility/", UtilityUploadView.as_view()),
    path("travel/import/", TravelImportView.as_view()),
]