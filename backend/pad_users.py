import sys
sys.path.insert(0, '.')
import django
import os

os.environ['DJANGO_SETTINGS_MODULE']='syncher.settings.development'
django.setup()

from django.contrib.auth import get_user_model
from apps.tracker.models import CycleLog
from datetime import date

User = get_user_model()
users = User.objects.all()

for u in users:
    if CycleLog.objects.filter(user=u).count() < 3:
        print(f'Adding cycles for {u.email}')
        try:
            CycleLog.objects.create(user=u, start_date=date(2023,1,1), cycle_length=28, period_length=5)
            CycleLog.objects.create(user=u, start_date=date(2023,1,29), cycle_length=29, period_length=5)
            CycleLog.objects.create(user=u, start_date=date(2023,2,27), cycle_length=27, period_length=5)
            CycleLog.objects.create(user=u, start_date=date(2023,3,26), cycle_length=28, period_length=5)
        except Exception as e:
            print("Error padding:", e)

print('Done padding all users with mock cycles so training works.')
